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
      // SmoothLife v1 defaults
      innerRadius: 1.0, outerRadius: 3.0, B1: 0.278, B2: 0.365,
      D1: 0.278, D2: 0.445, M: 2.0, alpha: 0.03, beta: 0.07,
      // SmoothLife v2 defaults
      innerRadiusV2: 3.0, outerRadiusV2: 10.0, B1V2: 0.257, B2V2: 0.336, D1V2: 0.365, D2V2: 0.549,
      // Lenia defaults
      R: 13.0, T: 10.0, leniaM: 0.15, S: 0.015
    }

    // Use params if available, otherwise fallback
    const values = params || fallbackValues

    return {
      gridSizeTSL: uniform(dimensions.WIDTH),
      // SmoothLife v1 uniforms
      innerRadius: uniform(values.innerRadius || fallbackValues.innerRadius),
      outerRadius: uniform(values.outerRadius || fallbackValues.outerRadius),
      B1: uniform(values.B1 || fallbackValues.B1),
      B2: uniform(values.B2 || fallbackValues.B2),
      D1: uniform(values.D1 || fallbackValues.D1),
      D2: uniform(values.D2 || fallbackValues.D2),
      M: uniform(values.M || fallbackValues.M),
      alpha: uniform(values.alpha || fallbackValues.alpha),
      beta: uniform(values.beta || fallbackValues.beta),
      // SmoothLife v2 uniforms
      innerRadiusV2: uniform(values.innerRadiusV2 || fallbackValues.innerRadiusV2),
      outerRadiusV2: uniform(values.outerRadiusV2 || fallbackValues.outerRadiusV2),
      B1V2: uniform(values.B1V2 || fallbackValues.B1V2),
      B2V2: uniform(values.B2V2 || fallbackValues.B2V2),
      D1V2: uniform(values.D1V2 || fallbackValues.D1V2),
      D2V2: uniform(values.D2V2 || fallbackValues.D2V2),
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
      } else if (simulationType === 'smoothv2') {
        computeNode = computeShader({
          cellStateIn: readStateTSL,
          cellStateOut: writeStateTSL,
          cellGridCoords: cellGridCoordTSL,
          index: instanceIndex,
          gridSize: uniforms.gridSizeTSL,
          innerRadius: uniforms.innerRadiusV2,
          outerRadius: uniforms.outerRadiusV2,
          b1: uniforms.B1V2, b2: uniforms.B2V2, d1: uniforms.D1V2, d2: uniforms.D2V2
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
    
    if (simulationType === 'lenia') {
      // Specific seed pattern for Lenia
        const pattern = {
          orbium: {
              cells: [
              [0, 0, 0, 0, 0, 0, 0.1, 0.14, 0.1, 0, 0, 0.03, 0.03, 0, 0, 0.3, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0.08, 0.24, 0.3, 0.3, 0.18, 0.14, 0.15, 0.16, 0.15, 0.09, 0.2, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0.15, 0.34, 0.44, 0.46, 0.38, 0.18, 0.14, 0.11, 0.13, 0.19, 0.18, 0.45, 0, 0, 0],
              [0, 0, 0, 0, 0.06, 0.13, 0.39, 0.5, 0.5, 0.37, 0.06, 0, 0, 0, 0.02, 0.16, 0.68, 0, 0, 0],
              [0, 0, 0, 0.11, 0.17, 0.17, 0.33, 0.4, 0.38, 0.28, 0.14, 0, 0, 0, 0, 0, 0.18, 0.42, 0, 0],
              [0, 0, 0.09, 0.18, 0.13, 0.06, 0.08, 0.26, 0.32, 0.32, 0.27, 0, 0, 0, 0, 0, 0, 0.82, 0, 0],
              [0.27, 0, 0.16, 0.12, 0, 0, 0, 0.25, 0.38, 0.44, 0.45, 0.34, 0, 0, 0, 0, 0, 0.22, 0.17, 0],
              [0, 0.07, 0.2, 0.02, 0, 0, 0, 0.31, 0.48, 0.57, 0.6, 0.57, 0, 0, 0, 0, 0, 0, 0.49, 0],
              [0, 0.59, 0.19, 0, 0, 0, 0, 0.2, 0.57, 0.69, 0.76, 0.76, 0.49, 0, 0, 0, 0, 0, 0.36, 0],
              [0, 0.58, 0.19, 0, 0, 0, 0, 0, 0.67, 0.83, 0.9, 0.92, 0.87, 0.12, 0, 0, 0, 0, 0.22, 0.07],
              [0, 0, 0.46, 0, 0, 0, 0, 0, 0.7, 0.93, 1, 1, 1, 0.61, 0, 0, 0, 0, 0.18, 0.11],
              [0, 0, 0.82, 0, 0, 0, 0, 0, 0.47, 1, 1, 0.98, 1, 0.96, 0.27, 0, 0, 0, 0.19, 0.1],
              [0, 0, 0.46, 0, 0, 0, 0, 0, 0.25, 1, 1, 0.84, 0.92, 0.97, 0.54, 0.14, 0.04, 0.1, 0.21, 0.05],
              [0, 0, 0, 0.4, 0, 0, 0, 0, 0.09, 0.8, 1, 0.82, 0.8, 0.85, 0.63, 0.31, 0.18, 0.19, 0.2, 0.01],
              [0, 0, 0, 0.36, 0.1, 0, 0, 0, 0.05, 0.54, 0.86, 0.79, 0.74, 0.72, 0.6, 0.39, 0.28, 0.24, 0.13, 0],
              [0, 0, 0, 0.01, 0.3, 0.07, 0, 0, 0.08, 0.36, 0.64, 0.7, 0.64, 0.6, 0.51, 0.39, 0.29, 0.19, 0.04, 0],
              [0, 0, 0, 0, 0.1, 0.24, 0.14, 0.1, 0.15, 0.29, 0.45, 0.53, 0.52, 0.46, 0.4, 0.31, 0.21, 0.08, 0, 0],
              [0, 0, 0, 0, 0, 0.08, 0.21, 0.21, 0.22, 0.29, 0.36, 0.39, 0.37, 0.33, 0.26, 0.18, 0.09, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0.03, 0.13, 0.19, 0.22, 0.24, 0.24, 0.23, 0.18, 0.13, 0.05, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.06, 0.08, 0.09, 0.07, 0.05, 0.01, 0, 0, 0, 0, 0]
              ]
          }
      };

      const scale = 1;
      const cx = 150;
      const cy = 225;

      // Scale and place the Orbium pattern in the world
      const orbiumCells = pattern.orbium.cells;

      // Initialize cellStateArray with zeros
      for (let i = 0; i < newState.length; i++) {
        newState[i] = 0;
      }

      let placedCells = 0;
      for (let i = 0; i < orbiumCells.length; i++) {
          for (let j = 0; j < orbiumCells[i].length; j++) {
              const x = cx + i * scale;
              const y = cy + j * scale;
              
              // Bounds checking
              if (x >= 0 && x < dimensions.WIDTH && y >= 0 && y < dimensions.HEIGHT) {
                  const index = y * dimensions.WIDTH + x;
                  newState[index] = orbiumCells[i][j];
                  placedCells++;
              }
          }
      }
    } else {
      // Random initialization for other simulations
      for (let i = 0; i < COUNT; i++) newState[i] = Math.random()
    }

    cellStateBufferA.array.set(newState)
    cellStateBufferB.array.fill(0)

    cellStateBufferA.needsUpdate = true
    cellStateBufferB.needsUpdate = true

    readStateRef.current = cellStateBufferA
    writeStateRef.current = cellStateBufferB

    setResetFlag(false)
  }, [resetFlag, simulationType])

  useEffect(() => {
    setResetFlag(true); // will trigger the existing reset effect
  }, [simulationType]);  
}
