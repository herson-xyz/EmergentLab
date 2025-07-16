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

    // === Buffers ===

    // Float state buffers (initialization handled in compute hook)
    const cellStateBufferA = new THREE.StorageInstancedBufferAttribute(new Float32Array(dimensions.COUNT), 1)
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

    return {
      gridSizeTSL,
      cellStateBufferA,
      cellStateBufferB,
      cellGridCoordBuffer,
      ...dimensions
    }
  }, [])
}
