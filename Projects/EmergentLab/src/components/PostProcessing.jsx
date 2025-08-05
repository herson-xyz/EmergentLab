import React, { useRef, useEffect, useState } from 'react'
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
    
    // Create a full-screen quad to display the grid texture
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.MeshBasicMaterial({ 
      map: gridTexture,
      transparent: true 
    })
    const quad = new THREE.Mesh(geometry, material)
    postProcessScene.add(quad)
    
    // Create render pass with our custom scene
    const renderPass = new RenderPass(postProcessScene, postProcessCamera)
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
  }, [gl, scene, camera, size, gridTexture])

  // Update material when texture changes
  useEffect(() => {
    if (composerRef.current && gridTexture) {
      const postProcessScene = composerRef.current.passes[0].scene
      if (postProcessScene.children[0]) {
        postProcessScene.children[0].material.map = gridTexture
        postProcessScene.children[0].material.needsUpdate = true
      }
    }
  }, [gridTexture])

  // Override the default renderer with our composer
  useFrame((state) => {
    if (composerRef.current && crtPassRef.current && gridTexture) {
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

  return (
    <>
      {/* Render grid to target (hidden) */}
      <GridRenderTarget onTextureReady={handleGridTextureReady} />
      {children}
    </>
  )
} 