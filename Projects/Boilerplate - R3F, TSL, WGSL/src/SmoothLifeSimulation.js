import { useRef, useEffect, useState, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { wgslFn, storage, instanceIndex, vec3 } from 'three/tsl'

import smoothLifeWGSL from './shaders/smoothLife.wgsl?raw'
import leniaWGSL from './shaders/lenia.wgsl?raw'
import { useSimulationState } from './hooks/useSimulationState'
import { useSimulationCompute } from './hooks/useSimulationCompute'
import { useSimulationParameterControls } from './hooks/useSimulationParameterControls'
import { useSimulationSelector } from './hooks/useSimulationSelector'
import { dimensions } from './constants/dimensions'
import SimulationControls from './components/SimulationControls'
import SimulationRenderer from './components/SimulationRenderer'

export default function MinimalComputeTest() {
  /*** ————————————————————————
   * References and WebGPU Renderer
   * ———————————————————————— */
  const { gl } = useThree()
  const renderer = gl

  const meshRef = useRef()
  const readStateRef = useRef()
  const writeStateRef = useRef()

  /*** ————————————————————————
   * Simulation State Controls
   * ———————————————————————— */
  const [isRunning, setIsRunning] = useState(true)
  const [resetFlag, setResetFlag] = useState(false)

  // Leva GUI controls for shader parameters
  const params = useSimulationParameterControls()

  // Leva GUI controls for simulation type
  const { simulationType } = useSimulationSelector()
  const computeShader = useMemo(() => {
    switch (simulationType) {
      case 'lenia':
        return wgslFn(leniaWGSL)
      case 'smooth':
      default:
        return wgslFn(smoothLifeWGSL)
    }
  }, [simulationType])

  // State buffers and uniform values for the simulation
  const {
    debugVec2Buffer,
    cellStateBufferA,
    cellStateBufferB,
    cellGridCoordBuffer,
    gridSizeTSL,
    innerRadius,
    outerRadius,
    B1, B2, D1, D2, M, alpha, beta
  } = useSimulationState()

  /*** ————————————————————————
   * Initial State Buffer Setup
   * ———————————————————————— */
  useEffect(() => {
    readStateRef.current = cellStateBufferA
    writeStateRef.current = cellStateBufferB
  }, [])

  /*** ————————————————————————
   * Compute Shader Simulation Hook
   * ———————————————————————— */
  useSimulationCompute({
    renderer,
    computeShader,
    simulationType,
    params,
    buffers: {
      debugVec2Buffer,
      cellStateBufferA,
      cellStateBufferB,
      cellGridCoordBuffer
    },
    uniforms: {
      innerRadius,
      outerRadius,
      B1, B2, D1, D2, M, alpha, beta,
      gridSizeTSL
    },
    dimensions,
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
        readStateBuffer={readStateRef.current}
      />
      <SimulationControls
        onPlay={() => setIsRunning(true)}
        onPause={() => setIsRunning(false)}
        onReset={() => setResetFlag(true)}
      />
    </>
  )
}
