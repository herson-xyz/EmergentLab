import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import WebGPUCellularAutomata from './WebGPUCellularAutomata'

export default function GridRenderTarget({ onTextureReady }) {
  const { gl, scene, size } = useThree()
  const renderTargetRef = useRef()

  // Create dedicated orthographic camera for grid rendering
  const gridCamera = useMemo(() => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    // Force square aspect ratio with zoom (smaller frustum = more zoom)
    camera.left = -0.2
    camera.right = 0.2
    camera.top = 0.2
    camera.bottom = -0.2
    camera.updateProjectionMatrix()
    return camera
  }, [])

  // Create render target with fixed 512x512 resolution to match grid
  const renderTarget = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(
      512,  // Match grid resolution
      512,  // Match grid resolution
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false
      }
    )
    renderTargetRef.current = target
    return target
  }, []) // Fixed size, no dependencies

  // Render grid to target
  useFrame(() => {
    if (renderTargetRef.current) {
      // Store current render target
      const currentRenderTarget = gl.getRenderTarget()
      
      // Set our render target
      gl.setRenderTarget(renderTargetRef.current)
      
      // Clear the render target
      gl.setClearColor(0x000000, 1)
      gl.clear()
      
      // Render the grid using dedicated orthographic camera
      gl.render(scene, gridCamera)
      
      // Restore original render target
      gl.setRenderTarget(currentRenderTarget)
      
      // Notify parent that texture is ready
      if (onTextureReady) {
        onTextureReady(renderTargetRef.current.texture)
      }
    }
  })

  return (
    <group>
      {/* Render the grid to our target */}
      <WebGPUCellularAutomata />
    </group>
  )
} 