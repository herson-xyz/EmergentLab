import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Center, MeshReflectorMaterial } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'
import ArcadeScreenMesh from './ArcadeScreenMesh'
import ArcadeBloom from './ArcadeBloom'

export default function ArcadeScene({ texture, enabled }) {
  const modelUrl = new URL('../models/retro_tv/scene.gltf', import.meta.url).href
  const gltf = useGLTF(modelUrl)

  const tvRef = useRef()
  const screenMeshRef = useRef(null)
  const crtMatRef = useRef(null)
  const { scene } = useThree()
  const redDirRef = useRef()

  // Separate Leva folder for the TV CRT parameters
  const crtTV = useControls('CRT (TV)', {
    enabled: { value: true },
    curvature: { value: 0.15, min: 0, max: 1, step: 0.01 },
    scanlines: { value: 1.0, min: 0, max: 1, step: 0.05 },
    vignette: { value: 0.6, min: 0, max: 2, step: 0.05 },
    cyanTint: { value: 0.12, min: 0, max: 0.5, step: 0.01 },
    colorBleeding: { value: 0.02, min: 0, max: 0.05, step: 0.001 },
    bleedingIntensity: { value: 0.8, min: 0, max: 1, step: 0.05 },
    brightness: { value: 1.0, min: 0.2, max: 2.0, step: 0.05 },
    gamma: { value: 1.0, min: 0.5, max: 2.0, step: 0.05 },
  })

  // Fog controls for Arcade scene
  const fogCtl = useControls('Fog (Arcade)', {
    enabled: { value: true },
    color: { value: '#0a0a0a' },
    near: { value: 2, min: 0, max: 50, step: 0.1 },
    far: { value: 18, min: 1, max: 200, step: 0.5 },
  })

  // Bloom controls
  const bloomCtl = useControls('Bloom (Arcade)', {
    enabled: { value: true },
    strength: { value: 1.0, min: 0, max: 3, step: 0.05 },
    radius: { value: 0.8, min: 0, max: 1.5, step: 0.05 },
    threshold: { value: 0.8, min: 0, max: 1, step: 0.01 },
    tvEmissive: { value: '#aa66ff' },
    tvEmissiveIntensity: { value: 2.5, min: 0, max: 6, step: 0.1 },
  })

  // Apply/cleanup fog on the root scene when Arcade is active
  useEffect(() => {
    if (enabled && fogCtl.enabled) {
      scene.fog = new THREE.Fog(new THREE.Color(fogCtl.color), fogCtl.near, fogCtl.far)
    } else {
      if (scene.fog) scene.fog = null
    }
    return () => {
      if (scene.fog) scene.fog = null
    }
  }, [enabled, fogCtl.enabled, fogCtl.color, fogCtl.near, fogCtl.far, scene])

  // Point the red directional light at the target
  useEffect(() => {
    if (!redDirRef.current) return
    redDirRef.current.target.position.set(0, 0, -9)
    redDirRef.current.target.updateMatrixWorld()
  }, [])

  // Ensure TV meshes cast shadows and set emissive to drive bloom
  useEffect(() => {
    if (!gltf.scene) return
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material && 'emissive' in child.material) {
          child.material.emissive = new THREE.Color(bloomCtl.tvEmissive)
          child.material.emissiveIntensity = bloomCtl.tvEmissiveIntensity
        }
      }
    })
  }, [gltf.scene, bloomCtl.tvEmissive, bloomCtl.tvEmissiveIntensity])

  // Locate the screen mesh by exact name, with heuristic fallback
  useEffect(() => {
    if (!gltf.scene) return

    // Exact name provided by user
    let candidate = gltf.scene.getObjectByName('Cube001_screen_0')

    // Fallback heuristic if exact not found
    if (!candidate) {
      gltf.scene.traverse((child) => {
        if (!child.isMesh) return
        const name = (child.name || '').toLowerCase()
        const matName = (child.material?.name || '').toLowerCase()
        if (
          name.includes('screen') ||
          name.includes('display') ||
          matName.includes('screen') ||
          matName.includes('display')
        ) {
          candidate = child
        }
      })
    }

    screenMeshRef.current = candidate || null
  }, [gltf.scene])

  // Create CRT ShaderMaterial (object-space) when texture and mesh are ready
  useEffect(() => {
    const mesh = screenMeshRef.current
    if (!mesh || !texture) return

    // Configure render-target texture for sampling
    texture.flipY = false
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.colorSpace = THREE.LinearSRGBColorSpace ? THREE.LinearSRGBColorSpace : THREE.NoColorSpace
    texture.needsUpdate = true

    const material = new THREE.ShaderMaterial({
      uniforms: {
        tSim: { value: texture },
        resolution: { value: new THREE.Vector2(512, 512) },
        curvature: { value: crtTV.curvature },
        scanlines: { value: crtTV.scanlines },
        vignette: { value: crtTV.vignette },
        cyanTint: { value: crtTV.cyanTint },
        colorBleeding: { value: crtTV.colorBleeding },
        bleedingIntensity: { value: crtTV.bleedingIntensity },
        brightness: { value: crtTV.brightness },
        gamma: { value: crtTV.gamma },
        enabled: { value: crtTV.enabled ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float curvature;
        void main() {
          vUv = uv;
          vec3 pos = position;
          vec2 uv_centered = uv - 0.5;
          float curve = curvature * 0.1; // object-space curvature
          float dist = length(uv_centered);
          float factor = 1.0 - dist * dist * curve;
          pos.xy *= factor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tSim;
        uniform vec2 resolution;
        uniform float curvature;
        uniform float scanlines;
        uniform float vignette;
        uniform float cyanTint;
        uniform float colorBleeding;
        uniform float bleedingIntensity;
        uniform float brightness;
        uniform float gamma;
        uniform float enabled;
        varying vec2 vUv;

        vec3 sampleBloom(vec2 uv, vec2 offset) {
          return texture2D(tSim, uv + offset).rgb;
        }

        void main() {
          vec2 uv = vUv;
          vec4 base = texture2D(tSim, uv);

          if (enabled < 0.5) {
            gl_FragColor = base;
            return;
          }

          // Color bleeding (RGB separation)
          float bleed = colorBleeding * bleedingIntensity;
          vec4 redC = texture2D(tSim, uv + vec2(bleed, 0.0));
          vec4 greenC = texture2D(tSim, uv + vec2(0.0, bleed));
          vec4 blueC = texture2D(tSim, uv + vec2(-bleed, 0.0));
          vec3 bleedMix = vec3(redC.r, greenC.g, blueC.b);
          float oldB = (base.r + base.g + base.b) / 3.0;
          float bleedMixAmt = oldB * bleedingIntensity;
          vec3 color = mix(base.rgb, bleedMix, bleedMixAmt);

          // Scanlines
          float sl = sin(uv.y * resolution.y * 2.0) * 0.5 + 0.5;
          sl = 1.0 - (1.0 - sl) * scanlines;
          color *= sl;

          // Vignette
          float vig = 1.0 - length(uv - 0.5) * vignette;
          color *= vig;

          // Brightness
          color *= brightness;

          // Cyan tint
          color += vec3(0.0, cyanTint, cyanTint);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: false,
      toneMapped: true,
    })

    const old = mesh.material
    mesh.material = material
    crtMatRef.current = material

    return () => {
      mesh.material = old
      material.dispose()
    }
  }, [texture, gltf.scene])

  // Update CRT uniforms when Leva params change
  useEffect(() => {
    const mat = crtMatRef.current
    if (!mat || !mat.uniforms) return
    mat.uniforms.curvature.value = crtTV.curvature
    mat.uniforms.scanlines.value = crtTV.scanlines
    mat.uniforms.vignette.value = crtTV.vignette
    mat.uniforms.cyanTint.value = crtTV.cyanTint
    mat.uniforms.colorBleeding.value = crtTV.colorBleeding
    mat.uniforms.bleedingIntensity.value = crtTV.bleedingIntensity
    mat.uniforms.brightness.value = crtTV.brightness
    mat.uniforms.gamma.value = crtTV.gamma
    mat.uniforms.enabled.value = crtTV.enabled ? 1.0 : 0.0
  }, [crtTV])

  useFrame(() => {})

  // Explicitly load provided concrete textures (albedo/diffuse, roughness, normal)
  const albedoUrl = useMemo(() => new URL('../textures/concrete_floor_worn_001_diff_1k.png', import.meta.url).href, [])
  const roughUrl = useMemo(() => new URL('../textures/concrete_floor_worn_001_rough_1k.png', import.meta.url).href, [])
  const normalUrl = useMemo(() => new URL('../textures/concrete_floor_worn_001_nor_gl_1k.png', import.meta.url).href, [])

  const albedoTex = useMemo(() => {
    const t = new THREE.TextureLoader().load(albedoUrl)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(16, 16)
    t.anisotropy = 8
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [albedoUrl])

  const roughTex = useMemo(() => {
    const t = new THREE.TextureLoader().load(roughUrl)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(16, 16)
    t.anisotropy = 8
    t.colorSpace = THREE.NoColorSpace
    return t
  }, [roughUrl])

  const normalTex = useMemo(() => {
    const t = new THREE.TextureLoader().load(normalUrl)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(16, 16)
    t.anisotropy = 8
    t.colorSpace = THREE.NoColorSpace
    return t
  }, [normalUrl])

  // Fixed downscale to bring very large models into view; Center will rebase pivot to origin
  const s = 0.005

  return (
    <group position={[0, 0, 0]}>
      {enabled && (
        <>
          <hemisphereLight intensity={0.6} groundColor={0x111111} />
          <directionalLight position={[2, 3, 2]} intensity={1.5} />
          {/* Red directional light targeting the origin */}
          <directionalLight
            ref={redDirRef}
            color="#ff2222"
            position={[1, 0, -8]}
            intensity={90}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* Reflective concrete floor with tiled detail */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <MeshReflectorMaterial
              color="#ffffff"
              map={albedoTex}
              metalness={0.05}
              roughness={0.9}
              roughnessMap={roughTex}
              normalMap={normalTex}
              normalScale={[2.0, 2.0]}
              blur={[150, 50]}
              mixStrength={0.8}
              mirror={0.15}
              depthScale={0.01}
              toneMapped
            />
          </mesh>

          {/* Auto-center the model at the origin and downscale */}
          <Center position={[0, 0.45, -9]} rotation={[0, Math.PI / 2, 0]}>
            <primitive ref={tvRef} object={gltf.scene} scale={[s, s, s]} />
          </Center>

          {/* Global Bloom for Arcade scene */}
          <ArcadeBloom enabled={bloomCtl.enabled} strength={bloomCtl.strength} radius={bloomCtl.radius} threshold={bloomCtl.threshold} />
        </>
      )}
    </group>
  )
} 