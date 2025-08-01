import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useControls } from 'leva'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { CRTShader } from '../shaders/CRTShader'

export default function PostProcessing({ children }) {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef()
  const crtPassRef = useRef()

  // Add Leva controls for CRT parameters
  const crtParams = useControls('CRT Effects', {
    enabled: { value: true, label: 'Enable CRT' },
    curvature: { value: 8.0, min: 0, max: 20, step: 0.5, label: 'Screen Curvature' },
    scanlines: { value: 0.8, min: 0, max: 1, step: 0.1, label: 'Scanlines' },
    vignette: { value: 0.5, min: 0, max: 1, step: 0.1, label: 'Vignette' },
    cyanTint: { value: 0.15, min: 0, max: 0.5, step: 0.05, label: 'Cyan Tint' },
    colorBleeding: { value: 0.02, min: 0, max: 0.05, step: 0.001, label: 'Color Bleeding' },
    bleedingIntensity: { value: 0.8, min: 0, max: 1, step: 0.1, label: 'Bleeding Intensity' },
    bloomIntensity: { value: 0.8, min: 0, max: 2, step: 0.1, label: 'Bloom Intensity' },
    bloomThreshold: { value: 0.6, min: 0, max: 1, step: 0.05, label: 'Bloom Threshold' },
    bloomRadius: { value: 4.0, min: 1, max: 10, step: 0.5, label: 'Bloom Radius' },
    brightness: { value: 1.2, min: 0.5, max: 2.0, step: 0.1, label: 'Brightness' },
    gamma: { value: 1.0, min: 0.5, max: 1.5, step: 0.1, label: 'Gamma' }
  })

  // Initialize EffectComposer
  useEffect(() => {
    if (!gl || !scene || !camera) return

    // Create EffectComposer
    const composer = new EffectComposer(gl)
    
    // Create render pass (renders the scene normally)
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)
    
    // Create CRT shader pass
    const crtPass = new ShaderPass(CRTShader)
    crtPass.uniforms.resolution.value = [size.width, size.height]
    composer.addPass(crtPass)
    
    composerRef.current = composer
    crtPassRef.current = crtPass

    return () => {
      composer.dispose()
    }
  }, [gl, scene, camera, size])

  // Override the default renderer with our composer
  useFrame((state) => {
    if (composerRef.current && crtPassRef.current) {
      // Update time uniform for animations
      crtPassRef.current.uniforms.time.value = state.clock.elapsedTime
      
      // Update CRT parameters from Leva controls
      crtPassRef.current.uniforms.curvature.value = crtParams.curvature
      crtPassRef.current.uniforms.scanlines.value = crtParams.scanlines
      crtPassRef.current.uniforms.vignette.value = crtParams.vignette
      crtPassRef.current.uniforms.cyanTint.value = crtParams.cyanTint
      crtPassRef.current.uniforms.colorBleeding.value = crtParams.colorBleeding
      crtPassRef.current.uniforms.bleedingIntensity.value = crtParams.bleedingIntensity
      crtPassRef.current.uniforms.bloomIntensity.value = crtParams.bloomIntensity
      crtPassRef.current.uniforms.bloomThreshold.value = crtParams.bloomThreshold
      crtPassRef.current.uniforms.bloomRadius.value = crtParams.bloomRadius
      crtPassRef.current.uniforms.brightness.value = crtParams.brightness
      crtPassRef.current.uniforms.gamma.value = crtParams.gamma
      
      // Only render if CRT is enabled
      if (crtParams.enabled) {
        composerRef.current.render()
        return false // Prevent R3F from rendering again
      }
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

  return <>{children}</>
} 