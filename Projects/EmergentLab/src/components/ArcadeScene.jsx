import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'
import ArcadeScreenMesh from './ArcadeScreenMesh'

export default function ArcadeScene({ texture, enabled }) {
  const modelUrl = new URL('../models/retro_tv/scene.gltf', import.meta.url).href
  const gltf = useGLTF(modelUrl)

  const tvRef = useRef()
  const screenMeshRef = useRef(null)
  const crtMatRef = useRef(null)

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
    if (candidate) {
      console.log('[ArcadeScene] Using screen mesh:', candidate.name, candidate.material?.name)
    } else {
      console.warn('[ArcadeScene] Screen mesh NOT found (using heuristic failed)')
    }
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

  // Fixed downscale to bring very large models into view; Center will rebase pivot to origin
  const s = 0.005

  return (
    <group position={[0, 0, 0]}>
      {/* {enabled && texture ? (
        <ArcadeScreenMesh texture={texture} />
      ) : (
        <mesh>
          <boxGeometry args={[0.5, 0.3, 0.05]} />
          <meshBasicMaterial color={'#222'} />
        </mesh>
      )} */}

      {enabled && (
        <>
          <hemisphereLight intensity={0.6} groundColor={0x111111} />
          <directionalLight position={[2, 3, 2]} intensity={1.5} />

          {/* Auto-center the model at the origin and downscale */}
          <Center position={[0, 0, -7]} rotation={[0, Math.PI / 2, 0]}>
            <primitive ref={tvRef} object={gltf.scene} scale={[s, s, s]} />
          </Center>
        </>
      )}
    </group>
  )
} 