import { useRef, useEffect, useState, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { wgslFn, storage, instanceIndex, vec3 } from 'three/tsl'
import { useControls } from 'leva'

import smoothLifeWGSLv1 from './shaders/smoothLifev1.wgsl?raw'
import smoothLifeWGSLv2 from './shaders/smoothLifev2.wgsl?raw'
import leniaWGSL from './shaders/lenia.wgsl?raw'
import { useSimulationState } from './hooks/useSimulationInitialState'
import { useSimulationCompute } from './hooks/useSimulationCompute'
import { useSimulationSelector } from './hooks/useSimulationSelector'
import { dimensions } from './constants/dimensions'
import SimulationControls from './components/SimulationControls'
import SimulationRenderer from './components/SimulationRenderer'
import SimulationParameters from './components/SimulationParameters'

export default function MinimalComputeTest() {
  /*** ————————————————————————
   * References and WebGPU Renderer
   * ———————————————————————— */
  const { gl } = useThree()
  const renderer = gl

  const meshRef = useRef()

  /*** ————————————————————————
   * Simulation State Controls
   * ———————————————————————— */
  const [isRunning, setIsRunning] = useState(true)
  const [resetFlag, setResetFlag] = useState(false)

  // Leva GUI controls for simulation type
  const { simulationType } = useSimulationSelector()
  const computeShader = useMemo(() => {
    switch (simulationType) {
      case 'lenia':
        return wgslFn(leniaWGSL)
      case 'smoothv2':
        return wgslFn(smoothLifeWGSLv2)
      case 'smooth':
      default:
        return wgslFn(smoothLifeWGSLv1)
    }
  }, [simulationType])

  // Get parameters from the dedicated component
  const params = SimulationParameters(simulationType)

  // State buffers and uniform values for the simulation
  const {
    cellStateBufferA,
    cellStateBufferB,
    cellGridCoordBuffer
  } = useSimulationState()

  /*** ————————————————————————
   * Compute Shader Simulation Hook
   * ———————————————————————— */
  useSimulationCompute({
    renderer,
    computeShader,
    simulationType,
    params,
    buffers: {
      cellStateBufferA,
      cellStateBufferB,
      cellGridCoordBuffer
    },
    isRunning,
    resetFlag,
    setResetFlag
  })

  /*** ————————————————————————
   * JSX Output
   * ———————————————————————— */
  return (
    <>
      <SimulationRenderer
        meshRef={meshRef}
        readStateBuffer={cellStateBufferA}
      />
      <SimulationControls
        onPlay={() => setIsRunning(true)}
        onPause={() => setIsRunning(false)}
        onReset={() => setResetFlag(true)}
      />
    </>
  )
}
