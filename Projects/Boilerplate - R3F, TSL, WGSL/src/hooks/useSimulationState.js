import { useMemo } from 'react'
import * as THREE from 'three/webgpu'
import { storage, uniform, vec3, instanceIndex } from 'three/tsl'
import { dimensions } from '../constants/dimensions'

/**
 * Hook to initialize and manage the state of the SmoothLife compute simulation.
 */
export function useSimulationState() {
  return useMemo(() => {
    // === Uniforms for shader ===
    const gridSizeTSL = uniform(dimensions.WIDTH)
    const innerRadius = uniform(1.0)
    const outerRadius = uniform(3.0)
    const B1 = uniform(0.278)
    const B2 = uniform(0.365)
    const D1 = uniform(0.278)
    const D2 = uniform(0.445)
    const M = uniform(2.0)
    const alpha = uniform(0.03)
    const beta = uniform(0.07)

    // === Buffers ===

    // Used to debug inner/outer neighborhood averages (x, y)
    const debugVec2Buffer = new THREE.StorageInstancedBufferAttribute(
      new Float32Array(dimensions.COUNT * 2),
      2
    )

    // Float state buffer initialized with random values
    ///////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////

    const initialState = new Float32Array(dimensions.COUNT)

    for (let i = 0; i < dimensions.COUNT; i++) {
      const x = i % dimensions.WIDTH
      const y = Math.floor(i / dimensions.WIDTH)
    
      // Checkerboard pattern of midrange values
      const isOn = (x + y) % 2 === 0
      initialState[i] = isOn ? 0.6 : 0.4
    }
    
    ///////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////

    const cellStateBufferA = new THREE.StorageInstancedBufferAttribute(initialState, 1)
    const cellStateBufferB = new THREE.StorageInstancedBufferAttribute(new Float32Array(dimensions.COUNT), 1)

    // Grid coordinates (x, y) for each cell in the grid
    const cellGridCoordinates = new Uint32Array(dimensions.COUNT * 2)
    for (let i = 0; i < dimensions.COUNT; i++) {
      const x = i % dimensions.WIDTH
      const y = Math.floor(i / dimensions.WIDTH)
      cellGridCoordinates[i * 2 + 0] = x
      cellGridCoordinates[i * 2 + 1] = y
    }

    const cellGridCoordBuffer = new THREE.StorageInstancedBufferAttribute(cellGridCoordinates, 2)

    // Used for debug coloring (not currently returned but can be re-exposed)
    const baseColor = vec3(1, 1, 0)
    const colorFromDebugOutputY = baseColor.mul(storage(debugVec2Buffer, 'vec2', dimensions.COUNT).element(instanceIndex).y)

    return {
      gridSizeTSL,
      debugVec2Buffer,
      colorFromDebugOutputY,
      cellStateBufferA,
      cellStateBufferB,
      cellGridCoordBuffer,
      innerRadius,
      outerRadius,
      B1,
      B2,
      D1,
      D2,
      M,
      alpha,
      beta,
      ...dimensions
    }
  }, [])
}
