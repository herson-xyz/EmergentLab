import { useRef, useEffect, useMemo } from 'react'
import { storage, instanceIndex, uniform } from 'three/tsl'
import { dimensions } from '../constants/dimensions'

/**
 * Manages the SmoothLife compute shader loop and buffer updates.
 */
export function useSimulationCompute({
  renderer,
  computeShader,
  simulationType,
  params,
  buffers,
  isRunning,
  resetFlag,
  setResetFlag
}) {
  const frameCount = useRef(0)
  const skipFrames = 2

  const { cellStateBufferA, cellStateBufferB, cellGridCoordBuffer } = buffers
  const { COUNT } = dimensions

  const readStateRef = useRef(cellStateBufferA)
  const writeStateRef = useRef(cellStateBufferB)

  // Create uniforms dynamically from params with fallback values
  const uniforms = useMemo(() => {
    // Fallback values in case Leva hasn't mounted yet
    const fallbackValues = {
      // SmoothLife defaults
      innerRadius: 1.0, outerRadius: 3.0, B1: 0.278, B2: 0.365,
      D1: 0.278, D2: 0.445, M: 2.0, alpha: 0.03, beta: 0.07,
      // Lenia defaults
      R: 13.0, T: 10.0, leniaM: 0.15, S: 0.015
    }

    // Use params if available, otherwise fallback
    const values = params || fallbackValues

    return {
      gridSizeTSL: uniform(dimensions.WIDTH),
      // SmoothLife uniforms
      innerRadius: uniform(values.innerRadius || fallbackValues.innerRadius),
      outerRadius: uniform(values.outerRadius || fallbackValues.outerRadius),
      B1: uniform(values.B1 || fallbackValues.B1),
      B2: uniform(values.B2 || fallbackValues.B2),
      D1: uniform(values.D1 || fallbackValues.D1),
      D2: uniform(values.D2 || fallbackValues.D2),
      M: uniform(values.M || fallbackValues.M),
      alpha: uniform(values.alpha || fallbackValues.alpha),
      beta: uniform(values.beta || fallbackValues.beta),
      // Lenia uniforms
      R: uniform(values.R || fallbackValues.R),
      T: uniform(values.T || fallbackValues.T),
      leniaM: uniform(values.leniaM || fallbackValues.leniaM),
      S: uniform(values.S || fallbackValues.S)
    }
  }, [params])

  // Expose refs so simulation component can use them
  useEffect(() => {
    readStateRef.current = cellStateBufferA
    writeStateRef.current = cellStateBufferB
  }, [cellStateBufferA, cellStateBufferB])

  // One-time initialization on mount
  useEffect(() => {
    setResetFlag(true)
  }, [])

  // Frame loop
  useEffect(() => {
    const loop = () => {
      frameCount.current++

      if (!isRunning || frameCount.current % skipFrames !== 0) return
      if (!readStateRef.current || !writeStateRef.current) return

      const readStateTSL = storage(readStateRef.current, 'float', COUNT)
      const writeStateTSL = storage(writeStateRef.current, 'float', COUNT)
      const cellGridCoordTSL = storage(cellGridCoordBuffer, 'uvec2', COUNT)

      // Conditionally create compute node based on simulation type
      let computeNode
      if (simulationType === 'smooth') {
        computeNode = computeShader({
          cellStateIn: readStateTSL,
          cellStateOut: writeStateTSL,
          cellGridCoords: cellGridCoordTSL,
          index: instanceIndex,
          gridSize: uniforms.gridSizeTSL,
          innerRadius: uniforms.innerRadius,
          outerRadius: uniforms.outerRadius,
          B1: uniforms.B1, B2: uniforms.B2, D1: uniforms.D1, D2: uniforms.D2,
          M: uniforms.M, alpha: uniforms.alpha, beta: uniforms.beta
        }).compute(COUNT, [8])
      } else {
        // Lenia simulation - only pass required parameters
        computeNode = computeShader({
          cellStateIn: readStateTSL,
          cellStateOut: writeStateTSL,
          cellGridCoords: cellGridCoordTSL,
          index: instanceIndex,
          gridSize: uniforms.gridSizeTSL,
          R: uniforms.R, T: uniforms.T, M: uniforms.leniaM, S: uniforms.S
        }).compute(COUNT, [8])
      }

      renderer.compute(computeNode)

      // Swap buffers
      const temp = readStateRef.current
      readStateRef.current = writeStateRef.current
      writeStateRef.current = temp

      // Optional: inspect output
      // renderer.getArrayBufferAsync(writeStateRef.current).then(buf => {
      //   console.log("cellStateOut:", new Float32Array(buf).slice(0, 8))
      // })
    }

    let id

    function tick() {
      loop()
      id = requestAnimationFrame(tick)
    }
  
    id = requestAnimationFrame(tick)
  
    return () => cancelAnimationFrame(id)
  }, [renderer, isRunning, uniforms, computeShader, simulationType])

  /*** ————————————————————————
   * Reset Simulation on User Request
   * ———————————————————————— */

  useEffect(() => {
    if (!resetFlag) return

    const newState = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) newState[i] = Math.random()

    cellStateBufferA.array.set(newState)
    cellStateBufferB.array.fill(0)

    cellStateBufferA.needsUpdate = true
    cellStateBufferB.needsUpdate = true

    readStateRef.current = cellStateBufferA
    writeStateRef.current = cellStateBufferB

    setResetFlag(false)
  }, [resetFlag])

  useEffect(() => {
    setResetFlag(true); // will trigger the existing reset effect
  }, [simulationType]);  
}
