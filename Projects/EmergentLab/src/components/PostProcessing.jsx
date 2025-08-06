import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { CRTShader } from '../shaders/CRTShader'
import GridRenderTarget from './GridRenderTarget'

export default function PostProcessing({ children }) {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef()
  const crtPassRef = useRef()
  const [gridTexture, setGridTexture] = useState(null)
  
  // Create render target for the quad
  const quadRenderTarget = useMemo(() => {
    return new THREE.WebGLRenderTarget(512, 512, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false
    })
  }, [])

  // Add Leva controls for CRT parameters
  const crtParams = useControls('CRT Effects', {
    enabled: { value: true, label: 'Enable CRT' },
    curvature: { value: 0.3, min: 0, max: 1, step: 0.1, label: 'Screen Curvature' },
    scanlines: { value: 1.0, min: 0, max: 1, step: 0.1, label: 'Scanlines' },
    vignette: { value: 0.5, min: 0, max: 1, step: 0.1, label: 'Vignette' },
    cyanTint: { value: 0.15, min: 0, max: 0.5, step: 0.05, label: 'Cyan Tint' },
    colorBleeding: { value: 0.02, min: 0, max: 0.05, step: 0.001, label: 'Color Bleeding' },
    bleedingIntensity: { value: 0.8, min: 0, max: 1, step: 0.1, label: 'Bleeding Intensity' },
    bloomIntensity: { value: 1.5, min: 0, max: 2, step: 0.1, label: 'Bloom Intensity' },
    bloomThreshold: { value: 0, min: 0, max: 1, step: 0.05, label: 'Bloom Threshold' },
    bloomRadius: { value: 2.5, min: 1, max: 10, step: 0.5, label: 'Bloom Radius' },
    brightness: { value: 1.4, min: 0.5, max: 2.0, step: 0.1, label: 'Brightness' },
    gamma: { value: 1.0, min: 0.5, max: 1.5, step: 0.1, label: 'Gamma' }
  })

  // Handle grid texture from render target
  const handleGridTextureReady = (texture) => {
    setGridTexture(texture)
  }

  // Initialize EffectComposer
  useEffect(() => {
    if (!gl || !scene || !camera) return

    // Create EffectComposer
    const composer = new EffectComposer(gl)
    
    // Create a simple scene for post-processing
    const postProcessScene = new THREE.Scene()
    const postProcessCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    
    // Create a square quad to display the processed texture
    const geometry = new THREE.PlaneGeometry(1, 1) // Square quad for square texture
    
    // Create material with CRT effects applied via custom shader
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: quadRenderTarget.texture },
        time: { value: 0 },
        resolution: { value: [512, 512] },
        curvature: { value: crtParams.curvature },
        scanlines: { value: crtParams.scanlines },
        vignette: { value: crtParams.vignette },
        cyanTint: { value: crtParams.cyanTint },
        colorBleeding: { value: crtParams.colorBleeding },
        bleedingIntensity: { value: crtParams.bleedingIntensity },
        bloomIntensity: { value: crtParams.bloomIntensity },
        bloomThreshold: { value: crtParams.bloomThreshold },
        bloomRadius: { value: crtParams.bloomRadius },
        brightness: { value: crtParams.brightness },
        gamma: { value: crtParams.gamma },
        enabled: { value: crtParams.enabled ? 1.0 : 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform vec2 resolution;
        uniform float curvature;
        uniform float scanlines;
        uniform float vignette;
        uniform float cyanTint;
        uniform float colorBleeding;
        uniform float bleedingIntensity;
        uniform float bloomIntensity;
        uniform float bloomThreshold;
        uniform float bloomRadius;
        uniform float brightness;
        uniform float gamma;
        uniform float enabled;
        
        varying vec2 vUv;
        
        // Bloom sampling function
        vec3 sampleBloom(vec2 uv, vec2 offset) {
          return texture2D(tDiffuse, uv + offset).rgb;
        }
        
        void main() {
          if (enabled < 0.5) {
            // No CRT effects
            gl_FragColor = texture2D(tDiffuse, vUv);
            return;
          }
          
          // Apply screen curvature
          vec2 uv = vUv - 0.5;
          uv *= 1.0 + uv.yx * uv.yx * curvature;
          uv += 0.5;
          
          // Discard pixels outside the curved screen
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
          
          // Sample the original texture with color bleeding
          vec4 color = texture2D(tDiffuse, uv);
          
          // Apply color bleeding (RGB channel separation)
          float bleeding = colorBleeding * bleedingIntensity;
          
          // Sample red channel (slightly offset to the right)
          vec4 redChannel = texture2D(tDiffuse, uv + vec2(bleeding, 0.0));
          
          // Sample green channel (slightly offset down)
          vec4 greenChannel = texture2D(tDiffuse, uv + vec2(0.0, bleeding));
          
          // Sample blue channel (slightly offset to the left)
          vec4 blueChannel = texture2D(tDiffuse, uv + vec2(-bleeding, 0.0));
          
          // Combine channels with bleeding effect
          vec3 bleedingColor = vec3(
            redChannel.r,
            greenChannel.g,
            blueChannel.b
          );
          
          // Mix original color with bleeding color based on brightness
          float brightness_old = (color.r + color.g + color.b) / 3.0;
          float bleedingMix = brightness_old * bleedingIntensity;
          color.rgb = mix(color.rgb, bleedingColor, bleedingMix);
          
          // Apply bloom effect
          vec3 bloom = vec3(0.0);
          float totalWeight = 0.0;
          
          // Sample in a circular pattern around the current pixel
          for (float angle = 0.0; angle < 6.28318; angle += 0.785398) { // 8 samples
            for (float radius = 1.0; radius <= bloomRadius; radius += 1.0) {
              vec2 offset = vec2(cos(angle), sin(angle)) * radius / resolution;
              vec3 bloomSample = sampleBloom(uv, offset);
              
              // Only bloom bright areas
              float sampleBrightness = (bloomSample.r + bloomSample.g + bloomSample.b) / 3.0;
              if (sampleBrightness > bloomThreshold) {
                float weight = 1.0 / radius; // Fade with distance
                bloom += bloomSample * weight;
                totalWeight += weight;
              }
            }
          }
          
          // Normalize and apply bloom
          if (totalWeight > 0.0) {
            bloom /= totalWeight;
            color.rgb += bloom * bloomIntensity;
          }
          
          // Add scanlines (more obvious)
          float scanline = sin(uv.y * resolution.y * 2.0) * 0.5 + 0.5;
          scanline = 1.0 - (1.0 - scanline) * scanlines;
          color.rgb *= scanline;
          
          // Add vignette (more obvious)
          float vignetteEffect = 1.0 - length(uv - 0.5) * vignette;
          color.rgb *= vignetteEffect;
          
          // Apply brightness and gamma correction
          color.rgb = pow(color.rgb * brightness, vec3(1.0 / gamma));
          
          // Add cyan tint (adjustable)
          color.rgb += vec3(0.0, cyanTint, cyanTint);
          
          gl_FragColor = color;
        }
      `,
      transparent: true
    })
    
    const quad = new THREE.Mesh(geometry, material)
    postProcessScene.add(quad)
    
    // Create render pass with our custom scene
    const renderPass = new RenderPass(postProcessScene, postProcessCamera)
    composer.addPass(renderPass)
    
    composerRef.current = composer

    return () => {
      composer.dispose()
    }
  }, [gl, scene, camera, quadRenderTarget.texture])

  // Render quad to target and apply CRT effects
  useFrame(() => {
    if (gridTexture && quadRenderTarget) {
      // Create a temporary scene for the quad
      const tempScene = new THREE.Scene()
      const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      
      // Create quad with grid texture
      const geometry = new THREE.PlaneGeometry(2, 2)
      const material = new THREE.MeshBasicMaterial({ 
        map: gridTexture,
        transparent: true 
      })
      const quad = new THREE.Mesh(geometry, material)
      tempScene.add(quad)
      
      // Render to quad target
      gl.setRenderTarget(quadRenderTarget)
      gl.setClearColor(0x000000, 1)
      gl.clear()
      gl.render(tempScene, tempCamera)
      gl.setRenderTarget(null)
    }
  })

  // Update CRT uniforms and render
  useFrame((state) => {
    if (composerRef.current && gridTexture) {
      // Update CRT uniforms if material exists
      const postProcessScene = composerRef.current.passes[0].scene
      if (postProcessScene.children[0] && postProcessScene.children[0].material) {
        const material = postProcessScene.children[0].material
        if (material.uniforms) {
          material.uniforms.curvature.value = crtParams.curvature
          material.uniforms.scanlines.value = crtParams.scanlines
          material.uniforms.vignette.value = crtParams.vignette
          material.uniforms.cyanTint.value = crtParams.cyanTint
          material.uniforms.colorBleeding.value = crtParams.colorBleeding
          material.uniforms.bleedingIntensity.value = crtParams.bleedingIntensity
          material.uniforms.bloomIntensity.value = crtParams.bloomIntensity
          material.uniforms.bloomThreshold.value = crtParams.bloomThreshold
          material.uniforms.bloomRadius.value = crtParams.bloomRadius
          material.uniforms.brightness.value = crtParams.brightness
          material.uniforms.gamma.value = crtParams.gamma
          material.uniforms.enabled.value = crtParams.enabled ? 1.0 : 0.0
          material.uniforms.time.value = state.clock.elapsedTime
        }
      }
      
      // Render the final scene
      composerRef.current.render()
      return false // Prevent R3F from rendering again
    }
  }, 1) // Priority 1 to run after other useFrame calls

  // Handle resize
  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.setSize(size.width, size.height)
      if (crtPassRef.current) {
        crtPassRef.current.uniforms.resolution.value = [size.width, size.height]
      }
    }
  }, [size])

  return (
    <>
      {/* Render grid to target (hidden) */}
      <GridRenderTarget onTextureReady={handleGridTextureReady} />
      {children}
    </>
  )
} 