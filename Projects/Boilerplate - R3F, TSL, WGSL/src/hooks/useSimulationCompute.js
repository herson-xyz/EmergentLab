import { useRef, useEffect } from 'react'
import { storage, instanceIndex } from 'three/tsl'
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
  uniforms,
  isRunning,
  resetFlag,
  setResetFlag
}) {
  const frameCount = useRef(0)
  const skipFrames = 2

  const { cellStateBufferA, cellStateBufferB, debugVec2Buffer, cellGridCoordBuffer } = buffers
  const { innerRadius, outerRadius, B1, B2, D1, D2, M, alpha, beta, R, T, leniaM, S, gridSizeTSL } = uniforms
  const { COUNT } = dimensions

  const readStateRef = useRef(cellStateBufferA)
  const writeStateRef = useRef(cellStateBufferB)

  // Expose refs so simulation component can use them
  useEffect(() => {
    readStateRef.current = cellStateBufferA
    writeStateRef.current = cellStateBufferB
  }, [cellStateBufferA, cellStateBufferB])

  // Frame loop
  useEffect(() => {
    const loop = () => {
      frameCount.current++

      if (!isRunning || frameCount.current % skipFrames !== 0) return
      if (!readStateRef.current || !writeStateRef.current) return

      // Update uniforms from Leva - conditionally based on simulation type
      if (simulationType === 'smooth') {
        innerRadius.value = params.innerRadius
        outerRadius.value = params.outerRadius
        B1.value = params.B1
        B2.value = params.B2
        D1.value = params.D1
        D2.value = params.D2
        M.value = params.M
        alpha.value = params.alpha
        beta.value = params.beta
      } else if (simulationType === 'lenia') {
        R.value = params.R
        T.value = params.T
        leniaM.value = params.leniaM
        S.value = params.S
      }

      const readStateTSL = storage(readStateRef.current, 'float', COUNT)
      const writeStateTSL = storage(writeStateRef.current, 'float', COUNT)
      const debugVec2TSL = storage(debugVec2Buffer, 'vec2', COUNT)
      const cellGridCoordTSL = storage(cellGridCoordBuffer, 'uvec2', COUNT)

      // Conditionally create compute node based on simulation type
      let computeNode
      if (simulationType === 'smooth') {
        computeNode = computeShader({
          debugVec2Out: debugVec2TSL,
          cellStateIn: readStateTSL,
          cellStateOut: writeStateTSL,
          cellGridCoords: cellGridCoordTSL,
          index: instanceIndex,
          gridSize: gridSizeTSL,
          innerRadius,
          outerRadius,
          B1, B2, D1, D2, M, alpha, beta
        }).compute(COUNT, [8])
      } else {
        // Lenia simulation - only pass required parameters
        computeNode = computeShader({
          cellStateIn: readStateTSL,
          cellStateOut: writeStateTSL,
          cellGridCoords: cellGridCoordTSL,
          index: instanceIndex,
          gridSize: gridSizeTSL,
          R, T, M: leniaM, S
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
  }, [renderer, isRunning, params, computeShader])

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
