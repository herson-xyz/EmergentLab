import { useRef, useEffect, useState, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { wgslFn, storage, instanceIndex, vec3 } from 'three/tsl'
import { useControls } from 'leva'

import smoothLifeWGSL from './shaders/smoothLife.wgsl?raw'
import leniaWGSL from './shaders/lenia.wgsl?raw'
import { useSimulationState } from './hooks/useSimulationState'
import { useSimulationCompute } from './hooks/useSimulationCompute'
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

  // Leva GUI controls for shader parameters - simple approach with all parameters visible
  const params = useControls({
    // SmoothLife parameters
    innerRadius: { value: 1.0, min: 0.0, max: 5.0, step: 0.01 },
    outerRadius: { value: 3.0, min: 0.0, max: 10.0, step: 0.01 },
    B1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001 },
    B2: { value: 0.365, min: 0.0, max: 1.0, step: 0.001 },
    D1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001 },
    D2: { value: 0.445, min: 0.0, max: 1.0, step: 0.001 },
    M:  { value: 2.0,   min: 0.0, max: 10.0, step: 0.01 },
    alpha: { value: 0.03, min: 0.0, max: 1.0, step: 0.001 },
    beta:  { value: 0.07, min: 0.0, max: 1.0, step: 0.001 },
    // Lenia parameters
    R: { value: 13.0, min: 1.0, max: 30.0, step: 0.5 },
    T: { value: 10.0, min: 1.0, max: 50.0, step: 0.1 },
    leniaM: { value: 0.15, min: 0.0, max: 1.0, step: 0.001 },
    S: { value: 0.015, min: 0.001, max: 0.1, step: 0.001 },
  })

  // State buffers and uniform values for the simulation
  const {
    debugVec2Buffer,
    cellStateBufferA,
    cellStateBufferB,
    cellGridCoordBuffer,
    gridSizeTSL,
    innerRadius,
    outerRadius,
    B1, B2, D1, D2, M, alpha, beta,
    R, T, leniaM, S
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
      R, T, leniaM, S,
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
