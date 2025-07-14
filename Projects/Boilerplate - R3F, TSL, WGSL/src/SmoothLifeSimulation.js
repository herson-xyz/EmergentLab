import { useRef, useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { wgslFn, storage, instanceIndex, vec3 } from 'three/tsl'

import smoothLifeWGSL from './shaders/smoothLife.wgsl?raw'
import { useSmoothLifeState } from './hooks/useSmoothLifeState'
import { useSmoothLifeCompute } from './hooks/useSmoothLifeCompute'
import { useShaderParameterControls } from './hooks/useShaderParameterControls'
import SimulationControls from './components/SimulationControls'

// Constants for simulation dimensions
const WIDTH = 512
const HEIGHT = 512
const COUNT = WIDTH * HEIGHT

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
  const params = useShaderParameterControls()

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
  } = useSmoothLifeState()

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
  useSmoothLifeCompute({
    renderer,
    computeShader: wgslFn(smoothLifeWGSL),
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
    dimensions: {
      WIDTH,
      HEIGHT,
      COUNT
    },
    isRunning,
    resetFlag,
    setResetFlag
  })

  /*** ————————————————————————
   * Reset Simulation on User Request
   * ———————————————————————— */
  useEffect(() => {
    if (!resetFlag) return

    // Fill buffer A with random float values, clear B
    const newState = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      newState[i] = Math.random()
    }

    cellStateBufferA.array.set(newState)
    cellStateBufferB.array.fill(0)

    cellStateBufferA.needsUpdate = true
    cellStateBufferB.needsUpdate = true

    // Update read/write buffer refs
    readStateRef.current = cellStateBufferA
    writeStateRef.current = cellStateBufferB

    // Reset flag
    setResetFlag(false)
  }, [resetFlag])

  /*** ————————————————————————
   * Instanced Mesh Initialization
   * ———————————————————————— */
  useEffect(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current
    const dummy = new THREE.Object3D()
    const spacing = 0.05
    const offsetX = (WIDTH - 1) * spacing * 0.5
    const offsetY = (HEIGHT - 1) * spacing * 0.5

    // Position each instance in a grid
    for (let i = 0; i < COUNT; i++) {
      const x = i % WIDTH
      const y = Math.floor(i / WIDTH)

      dummy.position.set(x * spacing - offsetX, y * spacing - offsetY, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [])

  /*** ————————————————————————
   * Shader Output Nodes (Color & Opacity)
   * ———————————————————————— */

  // Fade from white to black based on cell state
  const fadedColorNode = readStateRef.current
    ? (() => {
        const stateElement = storage(readStateRef.current, 'float', COUNT).element(instanceIndex)
        const threshold = 0.05
        const fadeWidth = 0.05
        const fadeFactor = stateElement.smoothstep(threshold, threshold + fadeWidth)

        return vec3(1, 1, 1).sub(vec3(1, 1, 1).mul(fadeFactor)) // inverse brightness
      })()
    : vec3(1, 1, 1)

  // Opacity fades in with smoothstep
  const opacityFadeNode = readStateRef.current
    ? (() => {
        const stateElement = storage(readStateRef.current, 'float', COUNT).element(instanceIndex)
        const threshold = 0.05
        const fadeWidth = 0.05
        return stateElement.smoothstep(threshold, threshold + fadeWidth)
      })()
    : vec3(1)

  /*** ————————————————————————
   * JSX Output
   * ———————————————————————— */
  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
        <planeGeometry args={[0.04, 0.04]} />
        <meshBasicNodeMaterial
          colorNode={fadedColorNode}
          opacityNode={opacityFadeNode}
          transparent={true}
          depthWrite={false}
        />
      </instancedMesh>

      <SimulationControls
        onPlay={() => setIsRunning(true)}
        onPause={() => setIsRunning(false)}
        onReset={() => setResetFlag(true)}
      />
    </>
  )
}
