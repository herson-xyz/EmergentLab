import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createPortal, useThree } from '@react-three/fiber'
import WebGPUCellularAutomata from './WebGPUCellularAutomata'

/**
 * Phase 1: Offscreen simulation host.
 * - Creates an offscreen THREE.Scene
 * - Mounts WebGPUCellularAutomata into it via createPortal
 * - Prepares two cameras (mini/full) for later phases
 * Exposes scene and cameras via refs for consumers.
 */
export default function SimulationOffscreen({ simSceneRef, simCamMiniRef: simCamMiniRefProp, simCamFullRef: simCamFullRefProp }) {
  const { size } = useThree()

  // Offscreen scene containing only the simulation content
  const simScene = useMemo(() => new THREE.Scene(), [])

  // Square camera for minimized branch
  const simCamMiniRef = useRef(null)
  // Window-aspect camera for fullscreen branch
  const simCamFullRef = useRef(null)

  // Expose scene immediately
  useEffect(() => {
    if (simSceneRef) {
      simSceneRef.current = simScene
    }
  }, [simSceneRef, simScene])

  // Initialize/refresh cameras on size change and expose via refs
  useEffect(() => {
    // Mini cam (square)
    const camMini = new THREE.PerspectiveCamera(15, 1, 0.1, 1000)
    camMini.position.set(0, 0, 2)
    camMini.lookAt(0, 0, 0)
    camMini.updateProjectionMatrix()
    simCamMiniRef.current = camMini
    if (simCamMiniRefProp) simCamMiniRefProp.current = camMini

    // Full cam (match canvas aspect)
    const aspect = Math.max(1e-6, size.width / size.height)
    const camFull = new THREE.PerspectiveCamera(15, aspect, 0.1, 1000)
    camFull.position.set(0, 0, 2)
    camFull.lookAt(0, 0, 0)
    camFull.updateProjectionMatrix()
    simCamFullRef.current = camFull
    if (simCamFullRefProp) simCamFullRefProp.current = camFull
  }, [size.width, size.height, simCamMiniRefProp, simCamFullRefProp])

  // Mount WebGPU simulation into the offscreen scene via portal
  return createPortal(
    <group>
      <WebGPUCellularAutomata />
    </group>,
    simScene
  )
} 