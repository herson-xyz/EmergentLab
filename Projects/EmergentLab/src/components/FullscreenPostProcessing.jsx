import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

export default function FullscreenPostProcessing({ texture }) {
  const { gl, size } = useThree()
  const composerRef = useRef()
  
  // CRT parameters scaled for fullscreen
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

  // Initialize EffectComposer
  useEffect(() => {
    if (!gl) return

    console.log('FullscreenPostProcessing: Creating EffectComposer');

    // Create EffectComposer
    const composer = new EffectComposer(gl)
    
    // Create a simple scene for post-processing
    const postProcessScene = new THREE.Scene()
    const postProcessCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    
    // Use fullscreen aspect ratio
    const aspect = size.width / size.height
    postProcessCamera.left = -aspect
    postProcessCamera.right = aspect
    postProcessCamera.top = 1
    postProcessCamera.bottom = -1
    postProcessCamera.updateProjectionMatrix()
    
    // Create a quad that matches the fullscreen aspect ratio
    const geometry = new THREE.PlaneGeometry(2 * aspect, 2, 32, 32)
    
    // Create material with CRT effects scaled for fullscreen
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        resolution: { value: [size.width, size.height] },
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
        uniform float curvature;
        
        void main() {
          vUv = uv;
          
          // Apply curvature to the vertex position (scaled for fullscreen)
          vec3 pos = position;
          vec2 uv_centered = uv - 0.5;
          float curve = curvature * 0.05; // Reduced curvature for fullscreen
          
          // Apply pincushion distortion to vertex position
          float dist = length(uv_centered);
          float factor = 1.0 - dist * dist * curve;
          pos.xy *= factor;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
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
            // No CRT effects - just display the texture
            gl_FragColor = texture2D(tDiffuse, vUv);
            return;
          }
          
          // Use UV coordinates directly since curvature is applied to geometry
          vec2 uv = vUv;
          
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
          
          // Add scanlines (scaled for fullscreen)
          float scanline = sin(uv.y * resolution.y * 1.5) * 0.5 + 0.5; // Reduced frequency
          scanline = 1.0 - (1.0 - scanline) * scanlines;
          color.rgb *= scanline;
          
          // Add vignette (scaled for fullscreen)
          float vignetteEffect = 1.0 - length(uv - 0.5) * vignette * 0.8; // Reduced intensity
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
  }, [gl, size.width, size.height])

  // Update CRT uniforms and render
  useFrame((state) => {
    if (composerRef.current && texture) {
      // Update CRT uniforms if material exists
      const postProcessScene = composerRef.current.passes[0].scene
      if (postProcessScene.children[0] && postProcessScene.children[0].material) {
        const material = postProcessScene.children[0].material
        if (material.uniforms) {
          // Update all CRT uniforms with current values
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
          
          // Update the texture for CRT effects
          material.uniforms.tDiffuse.value = texture
          
          // Force material update to apply changes
          material.needsUpdate = true
          
          console.log('FullscreenPostProcessing: Updated uniforms with curvature:', crtParams.curvature);
        }
      }
      
      // Full viewport for fullscreen mode
      gl.setViewport(0, 0, size.width, size.height)
      
      // Render the final scene with CRT effects
      composerRef.current.render()
      
      return false // Prevent R3F from rendering again
    }
  }, 1) // Priority 1 to run after other useFrame calls

  // Handle resize
  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.setSize(size.width, size.height)
    }
  }, [size])

  // Update uniforms when CRT params change
  useEffect(() => {
    if (composerRef.current) {
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
          material.needsUpdate = true
          console.log('FullscreenPostProcessing: CRT params changed, updated uniforms');
        }
      }
    }
  }, [crtParams])

  return null
} 