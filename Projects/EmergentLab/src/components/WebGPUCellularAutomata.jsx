import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls, button } from 'leva'
import { useSimulationSelector } from '../hooks/useSimulationSelector'
import SimulationParameters from './simulation/Parameters'

const GRID_SIZE = 512
const WORKGROUP_SIZE = 8
const UPDATE_INTERVAL = 100

export default function WebGPUCellularAutomata() {
  const meshRef = useRef()
  const [webGPUState, setWebGPUState] = useState({
    device: null,
    isInitialized: false,
    error: null
  })
  
  const stepRef = useRef(0)
  const intervalRef = useRef(null)
  const [isRunning, setIsRunning] = useState(true) // Start running by default
  const [resetFlag, setResetFlag] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState(null)
  
  // Get simulation type and parameters from Leva controls
  const { simulationType } = useSimulationSelector()
  const params = SimulationParameters()
  
  // Fallback values in case Leva hasn't mounted yet
  const smoothLifeV1Params = params || {
    innerRadius: 1.0,
    outerRadius: 3.0,
    b1: 0.257,
    b2: 0.336,
    d1: 0.365,
    d2: 0.549,
    dt: 0.1,
    steepness: 0.001
  }
  
  // Handle visual updates in the render loop
  useFrame(() => {
    if (pendingUpdate && meshRef.current) {
      const instanceStateAttribute = meshRef.current.geometry.getAttribute('instanceState')
      if (instanceStateAttribute) {
        const oldArray = instanceStateAttribute.array
        // Update array in place instead of replacing reference
        for (let i = 0; i < pendingUpdate.length; i++) {
          oldArray[i] = pendingUpdate[i]
        }
        instanceStateAttribute.needsUpdate = true
        
        // Force material to update
        if (meshRef.current.material) {
          meshRef.current.material.needsUpdate = true
        }
      }
      setPendingUpdate(null)
    }
  })
  
  // Trigger reset on mount and when simulation type or initial state changes
  useEffect(() => {
    // Only trigger reset if WebGPU is already initialized
    if (webGPUState.isInitialized) {
      setResetFlag(true)
    }
  }, [simulationType, params?.initialState, webGPUState.isInitialized])

  // Update SmoothLife v1 parameters when they change
  useEffect(() => {
    if (webGPUState.isInitialized && simulationType === 'smoothLifeV1' && webGPUState.smoothLifeV1UniformBuffer1 && webGPUState.smoothLifeV1UniformBuffer2) {
      const paramArray1 = new Float32Array([
        params?.innerRadius || smoothLifeV1Params.innerRadius,
        params?.outerRadius || smoothLifeV1Params.outerRadius,
        params?.dt || smoothLifeV1Params.dt,
        params?.steepness || smoothLifeV1Params.steepness
      ])
      const paramArray2 = new Float32Array([
        params?.b1 || smoothLifeV1Params.b1,
        params?.b2 || smoothLifeV1Params.b2,
        params?.d1 || smoothLifeV1Params.d1,
        params?.d2 || smoothLifeV1Params.d2
      ])
      
      webGPUState.device.queue.writeBuffer(webGPUState.smoothLifeV1UniformBuffer1, 0, paramArray1)
      webGPUState.device.queue.writeBuffer(webGPUState.smoothLifeV1UniformBuffer2, 0, paramArray2)
    }
  }, [
    params,
    webGPUState.isInitialized,
    simulationType
  ])
  
  // Control functions for play/pause
  const handlePlay = () => {
    setIsRunning(true)
  }
  const handlePause = () => {
    setIsRunning(false)
  }
  const handleReset = () => {
    setResetFlag(true)
  }
  
  // Add controls directly in component
  useControls({
    'Play Simulation': button(handlePlay),
    'Pause Simulation': button(handlePause),
    'Reset Simulation': button(() => {
      handleReset()
      handlePlay() // optional: resume on reset
    })
  })

  // Initialize WebGPU
  useEffect(() => {
    
    // Clear any existing state first
    setWebGPUState({
      device: null,
      isInitialized: false,
      error: null
    })
    
    async function initializeWebGPU() {
      
      try {
        // Check WebGPU support
        if (!navigator.gpu) {
          throw new Error("WebGPU not supported on this browser.")
        }

        // Request adapter and device
        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) {
          throw new Error("No appropriate GPUAdapter found.")
        }

        const device = await adapter.requestDevice()
        
        // Helper function to generate initial states
        const generateInitialState = (type, initialStateType) => {
          const array = new Float32Array(GRID_SIZE * GRID_SIZE)
          
          switch (initialStateType) {
            case 'random':
              if (type === 'gameOfLife') {
                // Binary random for Game of Life
                for (let i = 0; i < array.length; i++) {
                  array[i] = Math.random() > 0.6 ? 1.0 : 0.0
                }
              } else {
                // Continuous random for SmoothLife
                for (let i = 0; i < array.length; i++) {
                  array[i] = Math.random()
                }
              }
              break
              
            case 'centralBlob':
              for (let i = 0; i < array.length; i++) {
                const x = i % GRID_SIZE
                const y = Math.floor(i / GRID_SIZE)
                const centerX = GRID_SIZE / 2
                const centerY = GRID_SIZE / 2
                const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
                
                if (dist < 20) {
                  array[i] = type === 'gameOfLife' ? 1.0 : (Math.random() * 0.5 + 0.3)
                } else {
                  array[i] = 0.0
                }
              }
              break
              
            case 'multipleBlobs':
              for (let i = 0; i < array.length; i++) {
                const x = i % GRID_SIZE
                const y = Math.floor(i / GRID_SIZE)
                
                // Create several blobs
                let hasBlob = false
                for (let blob = 0; blob < 5; blob++) {
                  const centerX = GRID_SIZE * (0.2 + blob * 0.15)
                  const centerY = GRID_SIZE * (0.2 + (blob % 2) * 0.6)
                  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
                  
                  if (dist < 15) {
                    hasBlob = true
                    break
                  }
                }
                
                if (hasBlob) {
                  array[i] = type === 'gameOfLife' ? 1.0 : (Math.random() * 0.8 + 0.2)
                } else {
                  array[i] = 0.0
                }
              }
              break
              
            case 'glider':
              if (type === 'gameOfLife') {
                // Game of Life glider pattern
                const gliderPattern = [
                  [0, 1, 0],
                  [0, 0, 1],
                  [1, 1, 1]
                ]
                const startX = Math.floor(GRID_SIZE / 2) - 1
                const startY = Math.floor(GRID_SIZE / 2) - 1
                
                for (let i = 0; i < array.length; i++) {
                  const x = i % GRID_SIZE
                  const y = Math.floor(i / GRID_SIZE)
                  const patternX = x - startX
                  const patternY = y - startY
                  
                  if (patternX >= 0 && patternX < 3 && patternY >= 0 && patternY < 3) {
                    array[i] = gliderPattern[patternY][patternX]
                  } else {
                    array[i] = 0.0
                  }
                }
              } else {
                // For SmoothLife, create a glider-like pattern
                for (let i = 0; i < array.length; i++) {
                  const x = i % GRID_SIZE
                  const y = Math.floor(i / GRID_SIZE)
                  const centerX = GRID_SIZE / 2
                  const centerY = GRID_SIZE / 2
                  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
                  
                  if (dist < 10) {
                    array[i] = Math.random() * 0.5 + 0.3
                  } else {
                    array[i] = 0.0
                  }
                }
              }
              break
              
            case 'stillLife':
              if (type === 'gameOfLife') {
                // Game of Life block pattern
                const blockPattern = [
                  [1, 1],
                  [1, 1]
                ]
                const startX = Math.floor(GRID_SIZE / 2) - 1
                const startY = Math.floor(GRID_SIZE / 2) - 1
                
                for (let i = 0; i < array.length; i++) {
                  const x = i % GRID_SIZE
                  const y = Math.floor(i / GRID_SIZE)
                  const patternX = x - startX
                  const patternY = y - startY
                  
                  if (patternX >= 0 && patternX < 2 && patternY >= 0 && patternY < 2) {
                    array[i] = blockPattern[patternY][patternX]
                  } else {
                    array[i] = 0.0
                  }
                }
              } else {
                // For SmoothLife, create a stable pattern
                for (let i = 0; i < array.length; i++) {
                  const x = i % GRID_SIZE
                  const y = Math.floor(i / GRID_SIZE)
                  const centerX = GRID_SIZE / 2
                  const centerY = GRID_SIZE / 2
                  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
                  
                  if (dist < 8) {
                    array[i] = 0.5
                  } else {
                    array[i] = 0.0
                  }
                }
              }
              break
              
            case 'oscillator':
              if (type === 'gameOfLife') {
                // Game of Life blinker pattern
                const blinkerPattern = [1, 1, 1]
                const startX = Math.floor(GRID_SIZE / 2) - 1
                const startY = Math.floor(GRID_SIZE / 2)
                
                for (let i = 0; i < array.length; i++) {
                  const x = i % GRID_SIZE
                  const y = Math.floor(i / GRID_SIZE)
                  const patternX = x - startX
                  const patternY = y - startY
                  
                  if (patternX >= 0 && patternX < 3 && patternY === 0) {
                    array[i] = blinkerPattern[patternX]
                  } else {
                    array[i] = 0.0
                  }
                }
              } else {
                // For SmoothLife, create an oscillating pattern
                for (let i = 0; i < array.length; i++) {
                  const x = i % GRID_SIZE
                  const y = Math.floor(i / GRID_SIZE)
                  const centerX = GRID_SIZE / 2
                  const centerY = GRID_SIZE / 2
                  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
                  
                  if (dist < 12) {
                    array[i] = Math.random() * 0.3 + 0.4
                  } else {
                    array[i] = 0.0
                  }
                }
              }
              break
              
            case 'empty':
              // All cells dead/zero
              for (let i = 0; i < array.length; i++) {
                array[i] = 0.0
              }
              break
              
            case 'full':
              // All cells alive/one
              for (let i = 0; i < array.length; i++) {
                array[i] = 1.0
              }
              break
              
            case 'checkerboard':
              // Alternating pattern
              for (let i = 0; i < array.length; i++) {
                const x = i % GRID_SIZE
                const y = Math.floor(i / GRID_SIZE)
                const value = (x + y) % 2 === 0 ? 1.0 : 0.0
                array[i] = type === 'gameOfLife' ? value : (value * 0.8 + 0.1)
              }
              break
              
            case 'cross':
              // Cross pattern
              for (let i = 0; i < array.length; i++) {
                const x = i % GRID_SIZE
                const y = Math.floor(i / GRID_SIZE)
                const centerX = GRID_SIZE / 2
                const centerY = GRID_SIZE / 2
                const isCross = Math.abs(x - centerX) < 3 || Math.abs(y - centerY) < 3
                
                array[i] = isCross ? (type === 'gameOfLife' ? 1.0 : 0.8) : 0.0
              }
              break
              
            default:
              // Fallback to random
              for (let i = 0; i < array.length; i++) {
                array[i] = type === 'gameOfLife' ? (Math.random() > 0.6 ? 1.0 : 0.0) : Math.random()
              }
          }
          
          return array
        }
        
        // Generate initial state based on simulation type and selected initial state
        const cellStateArray = generateInitialState(simulationType, params?.initialState || 'random')
        
        

        // Create storage buffers for ping-pong pattern
        const cellStateStorageA = device.createBuffer({
          size: cellStateArray.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        })
        const cellStateStorageB = device.createBuffer({
          size: cellStateArray.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        })

        // Initialize buffers
        device.queue.writeBuffer(cellStateStorageA, 0, cellStateArray)
        device.queue.writeBuffer(cellStateStorageB, 0, cellStateArray)

        // Create uniform buffer for grid size
        const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE])
        const uniformBuffer = device.createBuffer({
          size: uniformArray.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        device.queue.writeBuffer(uniformBuffer, 0, uniformArray)
        
        // Create uniform buffers for SmoothLife v1 parameters (only if needed)
        let smoothLifeV1UniformBuffer1 = null
        let smoothLifeV1UniformBuffer2 = null
        
        if (simulationType === 'smoothLifeV1') {
          const createSmoothLifeV1UniformBuffer1 = () => {
            const paramArray = new Float32Array([
              smoothLifeV1Params.innerRadius,
              smoothLifeV1Params.outerRadius,
              smoothLifeV1Params.dt,
              smoothLifeV1Params.steepness
            ])
            return device.createBuffer({
              size: paramArray.byteLength,
              usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            })
          }
          
          const createSmoothLifeV1UniformBuffer2 = () => {
            const paramArray = new Float32Array([
              smoothLifeV1Params.b1,
              smoothLifeV1Params.b2,
              smoothLifeV1Params.d1,
              smoothLifeV1Params.d2
            ])
            return device.createBuffer({
              size: paramArray.byteLength,
              usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            })
          }
          
          smoothLifeV1UniformBuffer1 = createSmoothLifeV1UniformBuffer1()
          smoothLifeV1UniformBuffer2 = createSmoothLifeV1UniformBuffer2()
          
          
          device.queue.writeBuffer(smoothLifeV1UniformBuffer1, 0, new Float32Array([
            smoothLifeV1Params.innerRadius,
            smoothLifeV1Params.outerRadius,
            smoothLifeV1Params.dt,
            smoothLifeV1Params.steepness
          ]))
          
          device.queue.writeBuffer(smoothLifeV1UniformBuffer2, 0, new Float32Array([
            smoothLifeV1Params.b1,
            smoothLifeV1Params.b2,
            smoothLifeV1Params.d1,
            smoothLifeV1Params.d2
          ]))
        }

        // Create compute shader based on simulation type
        const getShaderCode = (type) => {
          // Add timestamp to force shader recompilation
          const timestamp = Date.now();
          if (type === 'gameOfLife') {
            return `
              @group(0) @binding(0) var<uniform> grid: vec2f;
              @group(0) @binding(1) var<storage> cellStateIn: array<f32>;
              @group(0) @binding(2) var<storage, read_write> cellStateOut: array<f32>;

              fn cellIndex(cell: vec2u) -> u32 {
                return cell.y * u32(grid.x) + cell.x;
              }

              @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
              fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
                let i = cellIndex(cell.xy);
                if (cell.x >= u32(grid.x) || cell.y >= u32(grid.y)) {
                  return;
                }

                let pos = cell.xy;
                let gridSize = u32(grid.x);

                // Count live neighbors
                var liveNeighbors: u32 = 0;
                for (var dx = -1; dx <= 1; dx = dx + 1) {
                  for (var dy = -1; dy <= 1; dy = dy + 1) {
                    if (dx == 0 && dy == 0) {
                      continue;
                    }
                    
                    let nx = (u32(pos.x) + u32(dx) + gridSize) % gridSize;
                    let ny = (u32(pos.y) + u32(dy) + gridSize) % gridSize;
                    let ni = ny * gridSize + nx;
                    
                    if (cellStateIn[ni] > 0.5) {
                      liveNeighbors = liveNeighbors + 1;
                    }
                  }
                }

                let currentState = cellStateIn[i];
                let isAlive = currentState > 0.5;
                
                // Game of Life rules
                var newState: f32 = 0.0;
                if (isAlive) {
                  if (liveNeighbors == 2 || liveNeighbors == 3) {
                    newState = 1.0;
                  }
                } else {
                  if (liveNeighbors == 3) {
                    newState = 1.0;
                  }
                }
                
                cellStateOut[i] = newState;
              }
            `
          } else if (type === 'smoothLifeV1') {
            return `
              // Shader compiled at: ${timestamp}
              @group(0) @binding(0) var<uniform> grid: vec2f;
              @group(0) @binding(1) var<storage> cellStateIn: array<f32>;
              @group(0) @binding(2) var<storage, read_write> cellStateOut: array<f32>;
              @group(0) @binding(3) var<uniform> smoothLifeV1Params: vec4f; // innerRadius, outerRadius, dt, steepness
              @group(0) @binding(4) var<uniform> smoothLifeV1Params2: vec4f; // b1, b2, d1, d2

              fn cellIndex(cell: vec2u) -> u32 {
                return cell.y * u32(grid.x) + cell.x;
              }

              @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
              fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
                let i = cellIndex(cell.xy);
                if (cell.x >= u32(grid.x) || cell.y >= u32(grid.y)) {
                  return;
                }

                let pos = cell.xy;
                let gridSize = u32(grid.x);
                let dt: f32 = smoothLifeV1Params.z;

                // === Begin CalculateNeighbors (inlined) ===
                let cellPos = vec2f(pos);
                var innerKernelCellTotal: f32 = 0.0;
                var innerKernelStateSum: f32 = 0.0;
                var outerKernelCellTotal: f32 = 0.0;
                var outerKernelStateSum: f32 = 0.0;

                // SmoothLife v1 parameters from uniforms
                let innerRadius: f32 = smoothLifeV1Params.x;
                let outerRadius: f32 = smoothLifeV1Params.y;
                let b1: f32 = smoothLifeV1Params2.x;
                let b2: f32 = smoothLifeV1Params2.y;
                let d1: f32 = smoothLifeV1Params2.z;
                let d2: f32 = smoothLifeV1Params2.w;

                // Debug: output parameter values to the first 4 cells for debugging
                if (i < 4) {
                  let steepness: f32 = smoothLifeV1Params.w;
                  if (i == 0) {
                    cellStateOut[i] = innerRadius;
                  }
                  if (i == 1) {
                    cellStateOut[i] = outerRadius;
                  }
                  if (i == 2) {
                    cellStateOut[i] = dt;
                  }
                  if (i == 3) {
                    cellStateOut[i] = steepness;
                  }
                  return;
                }

                let r: i32 = i32(outerRadius);

                for (var x = -r; x <= r; x = x + 1) {
                  for (var y = -r; y <= r; y = y + 1) {
                    let neighborCell = cellPos + vec2f(f32(x), f32(y));
                    let dist_from_center = length(cellPos - neighborCell);
                    let logres: f32 = 4.0;
                    let weight: f32 = 1.0 / (1.0 + exp(logres * (dist_from_center - outerRadius)));

                    let wrappedX = (u32(cellPos.x) + u32(x) + gridSize) % gridSize;
                    let wrappedY = (u32(cellPos.y) + u32(y) + gridSize) % gridSize;
                    let ni = wrappedY * gridSize + wrappedX;
                    let neighborState = cellStateIn[ni];

                    if (dist_from_center < innerRadius) {
                      innerKernelCellTotal = innerKernelCellTotal + weight;
                      innerKernelStateSum = innerKernelStateSum + (weight * neighborState);
                    } else if (dist_from_center > innerRadius && dist_from_center <= outerRadius) {
                      outerKernelCellTotal = outerKernelCellTotal + weight;
                      outerKernelStateSum = outerKernelStateSum + (weight * neighborState);
                    }
                  }
                }

                let innerAvg = innerKernelStateSum / max(innerKernelCellTotal, 0.0001);
                let outerAvg = outerKernelStateSum / max(outerKernelCellTotal, 0.0001);
                // === End CalculateNeighbors ===

                // === Begin life_dynamics_function (inlined) ===
                let steepness: f32 = smoothLifeV1Params.w;

                let life_activation_inner = 1.0 / (1.0 + exp(-(innerAvg - 0.5) * (4.0 / steepness)));
                let adaptive1 = b1 * (1.0 - life_activation_inner) + d1 * life_activation_inner;
                let adaptive2 = b2 * (1.0 - life_activation_inner) + d2 * life_activation_inner;

                let life_activation_outer1 = 1.0 / (1.0 + exp(-(outerAvg - adaptive1) * (4.0 / steepness)));
                let life_activation_outer2 = 1.0 / (1.0 + exp(-(outerAvg - adaptive2) * (4.0 / steepness)));

                let rateOfChange = life_activation_outer1 * (1.0 - life_activation_outer2);
                // === End life_dynamics_function ===

                let currentState = cellStateIn[i];
                let newCellState = currentState + dt * (rateOfChange - currentState);

                cellStateOut[i] = newCellState;
              }
            `
          } else if (type === 'smoothLifeV05') {
            return `
              @group(0) @binding(0) var<uniform> grid: vec2f;
              @group(0) @binding(1) var<storage> cellStateIn: array<f32>;
              @group(0) @binding(2) var<storage, read_write> cellStateOut: array<f32>;

              fn cellIndex(cell: vec2u) -> u32 {
                return cell.y * u32(grid.x) + cell.x;
              }

              @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
              fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
                let i = cellIndex(cell.xy);
                if (cell.x >= u32(grid.x) || cell.y >= u32(grid.y)) {
                  return;
                }

                let pos = cell.xy;
                let gridSize = u32(grid.x);

                var sumInner: f32 = 0.0;
                var sumOuter: f32 = 0.0;
                var countInner: f32 = 0.0;
                var countOuter: f32 = 0.0;

                // SmoothLife parameters - we'll make these uniforms later
                let innerRadius: f32 = 1.0;
                let outerRadius: f32 = 3.0;
                let B1: f32 = 0.278;
                let B2: f32 = 0.365;
                let D1: f32 = 0.278;
                let D2: f32 = 0.445;
                let M: f32 = 2.0;
                let alpha: f32 = 0.03;
                let beta: f32 = 0.07;

                let radius: i32 = i32(ceil(outerRadius));

                for (var dy: i32 = -radius; dy <= radius; dy = dy + 1) {
                  for (var dx: i32 = -radius; dx <= radius; dx = dx + 1) {
                    let wrappedX = ((i32(pos.x) + dx + i32(gridSize)) % i32(gridSize));
                    let wrappedY = ((i32(pos.y) + dy + i32(gridSize)) % i32(gridSize));

                    let ni = u32(wrappedY * i32(gridSize) + wrappedX);
                    let neighborVal = cellStateIn[ni];

                    let dist = sqrt(f32(dx * dx + dy * dy));
                    let weight = 1.0 / (1.0 + exp(4.0 * (dist - outerRadius)));

                    if (dist <= innerRadius) {
                      sumInner = sumInner + weight * neighborVal;
                      countInner = countInner + weight;
                    } else if (dist <= outerRadius) {
                      sumOuter = sumOuter + weight * neighborVal;
                      countOuter = countOuter + weight;
                    }
                  }
                }

                let innerAvg = sumInner / max(countInner, 0.0001);
                let outerAvg = sumOuter / max(countOuter, 0.0001);

                let aliveness = 1.0 / (1.0 + exp(-4.0 / M * (innerAvg - 0.005)));
                let threshold1 = mix(B1, D1, aliveness);
                let threshold2 = mix(B2, D2, aliveness);

                let logistic_a = 1.0 / (1.0 + exp(-4.0 / beta * (outerAvg - threshold1)));
                let logistic_b = 1.0 / (1.0 + exp(-4.0 / beta * (outerAvg - threshold2)));
                let newAlive = logistic_a * (1.0 - logistic_b);
                let newVal = clamp(newAlive, 0.0, 1.0);

                cellStateOut[i] = newVal;
              }
            `
          } else {
            // Default fallback shader (should not be reached)
            return `
              @group(0) @binding(0) var<uniform> grid: vec2f;
              @group(0) @binding(1) var<storage> cellStateIn: array<f32>;
              @group(0) @binding(2) var<storage, read_write> cellStateOut: array<f32>;

              fn cellIndex(cell: vec2u) -> u32 {
                return cell.y * u32(grid.x) + cell.x;
              }

              @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
              fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
                let i = cellIndex(cell.xy);
                if (cell.x >= u32(grid.x) || cell.y >= u32(grid.y)) {
                  return;
                }
                cellStateOut[i] = cellStateIn[i];
              }
            `
          }
        }

        const shaderCode = getShaderCode(simulationType)
        
        const simulationShaderModule = device.createShaderModule({
          code: shaderCode
        })

        // Create bind group layout based on simulation type
        const bindGroupLayoutEntries = [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "uniform" }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "read-only-storage" }
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
          }
        ]
        
        // Add SmoothLife v1 uniform bindings if needed
        if (simulationType === 'smoothLifeV1') {
          bindGroupLayoutEntries.push(
            {
              binding: 3,
              visibility: GPUShaderStage.COMPUTE,
              buffer: { type: "uniform" }
            },
            {
              binding: 4,
              visibility: GPUShaderStage.COMPUTE,
              buffer: { type: "uniform" }
            }
          )
        }
        
        const bindGroupLayout = device.createBindGroupLayout({
          entries: bindGroupLayoutEntries
        })

        // Create pipeline layout
        const pipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [bindGroupLayout]
        })

        // Create compute pipeline
        const simulationPipeline = device.createComputePipeline({
          layout: pipelineLayout,
          compute: {
            module: simulationShaderModule,
            entryPoint: "computeMain"
          }
        })

        // Create bind groups based on simulation type
        const bindGroupAEntries = [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: { buffer: cellStateStorageA } },
          { binding: 2, resource: { buffer: cellStateStorageB } }
        ]
        
        const bindGroupBEntries = [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: { buffer: cellStateStorageB } },
          { binding: 2, resource: { buffer: cellStateStorageA } }
        ]
        
        // Add SmoothLife v1 uniform bindings if needed
        if (simulationType === 'smoothLifeV1') {
          bindGroupAEntries.push(
            { binding: 3, resource: { buffer: smoothLifeV1UniformBuffer1 } },
            { binding: 4, resource: { buffer: smoothLifeV1UniformBuffer2 } }
          )
          bindGroupBEntries.push(
            { binding: 3, resource: { buffer: smoothLifeV1UniformBuffer1 } },
            { binding: 4, resource: { buffer: smoothLifeV1UniformBuffer2 } }
          )

        }
        
        const bindGroupA = device.createBindGroup({
          layout: bindGroupLayout,
          entries: bindGroupAEntries
        })

        const bindGroupB = device.createBindGroup({
          layout: bindGroupLayout,
          entries: bindGroupBEntries
        })

        setWebGPUState({
          device,
          isInitialized: true,
          error: null,
          cellStateStorageA,
          cellStateStorageB,
          bindGroupA,
          bindGroupB,
          simulationPipeline,
          cellStateArray,
          simulationType, // Store the current simulation type
          smoothLifeV1UniformBuffer1,
          smoothLifeV1UniformBuffer2
        })

      } catch (error) {
        console.error('WebGPU initialization failed:', error)
        setWebGPUState({
          device: null,
          isInitialized: false,
          error: error.message
        })
      }
    }

    initializeWebGPU()
  }, [simulationType])

  // Create Three.js geometry and material
  const { geometry, material, cellStates } = useMemo(() => {
    // Create instanced geometry for cells
    const geometry = new THREE.PlaneGeometry(1, 1)
    
    // Create instanced material with custom shaders
    const material = new THREE.ShaderMaterial({
             vertexShader: `
         attribute float instanceState;
         varying vec2 vCell;
         varying float vState;
         
         void main() {
           vState = instanceState;
           
           // Calculate cell position
           float instanceIndex = float(gl_InstanceID);
           float gridSize = ${GRID_SIZE}.0;
           vec2 cell = vec2(mod(instanceIndex, gridSize), floor(instanceIndex / gridSize));
           vCell = cell;
           
           // Calculate cell size and position
           float cellSize = 2.0 / gridSize; // Each cell takes up 2/gridSize of the total space
           vec2 cellOffset = (cell / gridSize - 0.5) * 2.0;
           
           // Scale the vertex position by cell size and state
           vec3 pos = position;
           pos.xy = pos.xy * cellSize * instanceState + cellOffset;
           
           gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
         }
       `,
      fragmentShader: `
        varying vec2 vCell;
        varying float vState;
        
        void main() {
          // Color based on cell position and state
          vec2 grid = vec2(${GRID_SIZE}.0, ${GRID_SIZE}.0);
          vec2 c = vCell / grid;
          
          // Use state value to determine color intensity
          float intensity = vState;
          gl_FragColor = vec4(c * intensity, 1.0 - c.x * intensity, 1.0);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    })

    // Create initial cell states
    const cellStates = new Float32Array(GRID_SIZE * GRID_SIZE)
    for (let i = 0; i < cellStates.length; i++) {
      cellStates[i] = Math.random() > 0.6 ? 1.0 : 0.0
    }

    return { geometry, material, cellStates }
  }, [])

  // Update simulation
  useEffect(() => {
    if (!webGPUState.isInitialized || webGPUState.error) return

    const updateSimulation = () => {
      // Skip update if simulation is paused
      if (!isRunning) return
      
      const currentStep = stepRef.current
      const device = webGPUState.device
      
      // Run compute shader
      const commandEncoder = device.createCommandEncoder()
      const computePass = commandEncoder.beginComputePass()
      computePass.setPipeline(webGPUState.simulationPipeline)
      computePass.setBindGroup(0, currentStep % 2 === 0 ? webGPUState.bindGroupA : webGPUState.bindGroupB)
      computePass.dispatchWorkgroups(Math.ceil(GRID_SIZE / WORKGROUP_SIZE), Math.ceil(GRID_SIZE / WORKGROUP_SIZE))
      computePass.end()
      
      device.queue.submit([commandEncoder.finish()])
      
      // Read back the updated state
      const readBuffer = device.createBuffer({
        size: webGPUState.cellStateArray.byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      })
      
      const commandEncoder2 = device.createCommandEncoder()
      commandEncoder2.copyBufferToBuffer(
        currentStep % 2 === 0 ? webGPUState.cellStateStorageB : webGPUState.cellStateStorageA,
        0,
        readBuffer,
        0,
        webGPUState.cellStateArray.byteLength
      )
      device.queue.submit([commandEncoder2.finish()])
      
      readBuffer.mapAsync(GPUMapMode.READ).then(() => {
        const newStates = new Float32Array(readBuffer.getMappedRange())
        
        // Debug: for SmoothLife v1, check if parameter values are being used
        if (simulationType === 'smoothLifeV1') {
          console.log('SmoothLife v1 debug - First 4 values (should be parameters):', newStates.slice(0, 4))
        }

        
        // Copy the data before unmapping to avoid detached ArrayBuffer
        const copiedStates = new Float32Array(newStates)
        
        // Queue the update for the next frame
        setPendingUpdate(copiedStates)
        
        readBuffer.unmap()
      })
      
      stepRef.current++
    }

    // Start simulation loop
    intervalRef.current = setInterval(updateSimulation, UPDATE_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [webGPUState.isInitialized, webGPUState.error, isRunning])

  // Set up instance attributes
  useEffect(() => {
    if (geometry && cellStates) {
      geometry.setAttribute('instanceState', new THREE.InstancedBufferAttribute(cellStates, 1))
    }
  }, [geometry, cellStates])

  // Reset simulation effect
  useEffect(() => {
    if (!resetFlag || !webGPUState.isInitialized) return

    // Helper function to generate initial states (same as in initializeWebGPU)
    const generateInitialState = (type, initialStateType) => {
      const array = new Float32Array(GRID_SIZE * GRID_SIZE)
      
      switch (initialStateType) {
        case 'random':
          if (type === 'gameOfLife') {
            for (let i = 0; i < array.length; i++) {
              array[i] = Math.random() > 0.6 ? 1.0 : 0.0
            }
          } else {
            for (let i = 0; i < array.length; i++) {
              array[i] = Math.random()
            }
          }
          break
          
        case 'centralBlob':
          for (let i = 0; i < array.length; i++) {
            const x = i % GRID_SIZE
            const y = Math.floor(i / GRID_SIZE)
            const centerX = GRID_SIZE / 2
            const centerY = GRID_SIZE / 2
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
            
            if (dist < 20) {
              array[i] = type === 'gameOfLife' ? 1.0 : (Math.random() * 0.5 + 0.3)
            } else {
              array[i] = 0.0
            }
          }
          break
          
        case 'multipleBlobs':
          for (let i = 0; i < array.length; i++) {
            const x = i % GRID_SIZE
            const y = Math.floor(i / GRID_SIZE)
            
            let hasBlob = false
            for (let blob = 0; blob < 5; blob++) {
              const centerX = GRID_SIZE * (0.2 + blob * 0.15)
              const centerY = GRID_SIZE * (0.2 + (blob % 2) * 0.6)
              const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
              
              if (dist < 15) {
                hasBlob = true
                break
              }
            }
            
            if (hasBlob) {
              array[i] = type === 'gameOfLife' ? 1.0 : (Math.random() * 0.8 + 0.2)
            } else {
              array[i] = 0.0
            }
          }
          break
          
        case 'glider':
          if (type === 'gameOfLife') {
            const gliderPattern = [
              [0, 1, 0],
              [0, 0, 1],
              [1, 1, 1]
            ]
            const startX = Math.floor(GRID_SIZE / 2) - 1
            const startY = Math.floor(GRID_SIZE / 2) - 1
            
            for (let i = 0; i < array.length; i++) {
              const x = i % GRID_SIZE
              const y = Math.floor(i / GRID_SIZE)
              const patternX = x - startX
              const patternY = y - startY
              
              if (patternX >= 0 && patternX < 3 && patternY >= 0 && patternY < 3) {
                array[i] = gliderPattern[patternY][patternX]
              } else {
                array[i] = 0.0
              }
            }
          } else {
            for (let i = 0; i < array.length; i++) {
              const x = i % GRID_SIZE
              const y = Math.floor(i / GRID_SIZE)
              const centerX = GRID_SIZE / 2
              const centerY = GRID_SIZE / 2
              const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
              
              if (dist < 10) {
                array[i] = Math.random() * 0.5 + 0.3
              } else {
                array[i] = 0.0
              }
            }
          }
          break
          
        case 'stillLife':
          if (type === 'gameOfLife') {
            const blockPattern = [
              [1, 1],
              [1, 1]
            ]
            const startX = Math.floor(GRID_SIZE / 2) - 1
            const startY = Math.floor(GRID_SIZE / 2) - 1
            
            for (let i = 0; i < array.length; i++) {
              const x = i % GRID_SIZE
              const y = Math.floor(i / GRID_SIZE)
              const patternX = x - startX
              const patternY = y - startY
              
              if (patternX >= 0 && patternX < 2 && patternY >= 0 && patternY < 2) {
                array[i] = blockPattern[patternY][patternX]
              } else {
                array[i] = 0.0
              }
            }
          } else {
            for (let i = 0; i < array.length; i++) {
              const x = i % GRID_SIZE
              const y = Math.floor(i / GRID_SIZE)
              const centerX = GRID_SIZE / 2
              const centerY = GRID_SIZE / 2
              const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
              
              if (dist < 8) {
                array[i] = 0.5
              } else {
                array[i] = 0.0
              }
            }
          }
          break
          
        case 'oscillator':
          if (type === 'gameOfLife') {
            const blinkerPattern = [1, 1, 1]
            const startX = Math.floor(GRID_SIZE / 2) - 1
            const startY = Math.floor(GRID_SIZE / 2)
            
            for (let i = 0; i < array.length; i++) {
              const x = i % GRID_SIZE
              const y = Math.floor(i / GRID_SIZE)
              const patternX = x - startX
              const patternY = y - startY
              
              if (patternX >= 0 && patternX < 3 && patternY === 0) {
                array[i] = blinkerPattern[patternX]
              } else {
                array[i] = 0.0
              }
            }
          } else {
            for (let i = 0; i < array.length; i++) {
              const x = i % GRID_SIZE
              const y = Math.floor(i / GRID_SIZE)
              const centerX = GRID_SIZE / 2
              const centerY = GRID_SIZE / 2
              const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
              
              if (dist < 12) {
                array[i] = Math.random() * 0.3 + 0.4
              } else {
                array[i] = 0.0
              }
            }
          }
          break
          
        case 'empty':
          for (let i = 0; i < array.length; i++) {
            array[i] = 0.0
          }
          break
          
        case 'full':
          for (let i = 0; i < array.length; i++) {
            array[i] = 1.0
          }
          break
          
        case 'checkerboard':
          for (let i = 0; i < array.length; i++) {
            const x = i % GRID_SIZE
            const y = Math.floor(i / GRID_SIZE)
            const value = (x + y) % 2 === 0 ? 1.0 : 0.0
            array[i] = type === 'gameOfLife' ? value : (value * 0.8 + 0.1)
          }
          break
          
        case 'cross':
          for (let i = 0; i < array.length; i++) {
            const x = i % GRID_SIZE
            const y = Math.floor(i / GRID_SIZE)
            const centerX = GRID_SIZE / 2
            const centerY = GRID_SIZE / 2
            const isCross = Math.abs(x - centerX) < 3 || Math.abs(y - centerY) < 3
            
            array[i] = isCross ? (type === 'gameOfLife' ? 1.0 : 0.8) : 0.0
          }
          break
          
        default:
          for (let i = 0; i < array.length; i++) {
            array[i] = type === 'gameOfLife' ? (Math.random() > 0.6 ? 1.0 : 0.0) : Math.random()
          }
      }
      
      return array
    }

    // Generate new initial state based on simulation type and selected initial state
    const newCellStates = generateInitialState(simulationType, params?.initialState || 'random')

    // Update WebGPU buffers
    if (webGPUState.device && webGPUState.cellStateStorageA && webGPUState.cellStateStorageB) {
      webGPUState.device.queue.writeBuffer(webGPUState.cellStateStorageA, 0, newCellStates)
      webGPUState.device.queue.writeBuffer(webGPUState.cellStateStorageB, 0, newCellStates)
    }

    // Update Three.js geometry
    if (meshRef.current) {
      const instanceStateAttribute = meshRef.current.geometry.getAttribute('instanceState')
      if (instanceStateAttribute) {
        instanceStateAttribute.array = newCellStates
        instanceStateAttribute.needsUpdate = true
      }
    }

    // Reset step counter
    stepRef.current = 0

    // Clear reset flag
    setResetFlag(false)
    
  }, [resetFlag, webGPUState.isInitialized, webGPUState.device, webGPUState.cellStateStorageA, webGPUState.cellStateStorageB, simulationType])

  // Error handling
  if (webGPUState.error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    )
  }

  if (!webGPUState.isInitialized) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="yellow" />
      </mesh>
    )
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, GRID_SIZE * GRID_SIZE]}
      frustumCulled={false}
    />
  )
} 