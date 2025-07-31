import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls, button } from 'leva'
import { useSimulationSelector } from '../hooks/useSimulationSelector'

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
  
  // Get simulation type from Leva controls
  const { simulationType } = useSimulationSelector()
  
  // Debug: log the simulation type
  console.log('Current simulation type:', simulationType)
  
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
        
        // Debug: check if the array actually changed (safely)
        try {
          const oldActive = oldArray.filter(val => val > 0.5).length
          const newActive = pendingUpdate.filter(val => val > 0.5).length
          console.log('Applied pending update in useFrame - Old active:', oldActive, 'New active:', newActive, 'Array changed:', oldActive !== newActive)
        } catch (e) {
          console.log('Applied pending update in useFrame - Array updated successfully')
        }
        
        // Force material to update
        if (meshRef.current.material) {
          meshRef.current.material.needsUpdate = true
        }
      } else {
        console.warn('No instanceState attribute in useFrame')
      }
      setPendingUpdate(null)
    }
  })
  
  // Trigger reset on mount and when simulation type changes
  useEffect(() => {
    console.log('Triggering reset for simulation type:', simulationType)
    // Only trigger reset if WebGPU is already initialized
    if (webGPUState.isInitialized) {
      setResetFlag(true)
    }
  }, [simulationType, webGPUState.isInitialized])
  
  // Control functions for play/pause
  const handlePlay = () => {
    console.log('Play clicked - starting simulation')
    setIsRunning(true)
  }
  const handlePause = () => {
    console.log('Pause clicked - pausing simulation')
    setIsRunning(false)
  }
  const handleReset = () => {
    console.log('Reset clicked - resetting simulation')
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
    console.log('Initializing WebGPU for simulation type:', simulationType)
    
    // Clear any existing state first
    setWebGPUState({
      device: null,
      isInitialized: false,
      error: null
    })
    
    async function initializeWebGPU() {
      console.log('Starting WebGPU initialization for:', simulationType)
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
        
        // Create cell state arrays - use Float32Array for SmoothLife compatibility
        const cellStateArray = new Float32Array(GRID_SIZE * GRID_SIZE)
        for (let i = 0; i < cellStateArray.length; i++) {
          cellStateArray[i] = Math.random() > 0.6 ? 1.0 : 0.0
        }
        console.log('Initial cell state - Active cells:', cellStateArray.filter(val => val > 0.5).length)

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

          // Create compute shader based on simulation type
  const getShaderCode = (type) => {
    if (type === 'smoothLifeV1') {
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
          let dt: f32 = 0.3;

          // === Begin CalculateNeighbors (inlined) ===
          let cellPos = vec2f(pos);
          var innerKernelCellTotal: f32 = 0.0;
          var innerKernelStateSum: f32 = 0.0;
          var outerKernelCellTotal: f32 = 0.0;
          var outerKernelStateSum: f32 = 0.0;

          // SmoothLife v1 parameters - we'll make these uniforms later
          let innerRadius: f32 = 3.0;
          let outerRadius: f32 = 10.0;
          let b1: f32 = 0.257;
          let b2: f32 = 0.336;
          let d1: f32 = 0.365;
          let d2: f32 = 0.549;

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
          let steepness: f32 = 0.001;

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
      // Game of Life shader
      return `
        @group(0) @binding(0) var<uniform> grid: vec2f;
        @group(0) @binding(1) var<storage> cellStateIn: array<f32>;
        @group(0) @binding(2) var<storage, read_write> cellStateOut: array<f32>;

        fn cellIndex(cell: vec2u) -> u32 {
          return cell.y * u32(grid.x) + cell.x;
        }

        fn cellActive(x: u32, y: u32) -> f32 {
          let boundsX = u32(grid.x);
          let boundsY = u32(grid.y);
          let index = cellIndex(vec2u(x % boundsX, y % boundsY));
          return cellStateIn[index];
        }

        @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
        fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
          let i = cellIndex(cell.xy);
          if (cell.x >= u32(grid.x) || cell.y >= u32(grid.y)) {
            return;
          }

          let activeNeighbors = cellActive(cell.x + 1, cell.y) +
                               cellActive(cell.x + 1, cell.y + 1) +
                               cellActive(cell.x, cell.y + 1) +
                               cellActive(cell.x - 1, cell.y + 1) +
                               cellActive(cell.x - 1, cell.y) +
                               cellActive(cell.x - 1, cell.y - 1) +
                               cellActive(cell.x, cell.y - 1) +
                               cellActive(cell.x + 1, cell.y - 1);

          // Convert to integer logic for Game of Life
          let currentState = select(0.0, 1.0, cellStateIn[i] > 0.5);
          let neighborCount = u32(round(activeNeighbors));

          switch neighborCount {
            case 2: {
              cellStateOut[i] = currentState;
            }
            case 3: {
              cellStateOut[i] = 1.0;
            }
            default: {
              cellStateOut[i] = 0.0;
            }
          }
        }
      `
    }
  }

  const shaderCode = getShaderCode(simulationType)
  console.log('Creating shader for type:', simulationType, 'Shader length:', shaderCode.length)
  
  const simulationShaderModule = device.createShaderModule({
    code: shaderCode
  })

        // Create bind group layout
        const bindGroupLayout = device.createBindGroupLayout({
          entries: [
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

        // Create bind groups
        const bindGroupA = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: { buffer: cellStateStorageA } },
            { binding: 2, resource: { buffer: cellStateStorageB } }
          ]
        })

        const bindGroupB = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: { buffer: cellStateStorageB } },
            { binding: 2, resource: { buffer: cellStateStorageA } }
          ]
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
          simulationType // Store the current simulation type
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
      
      console.log('Running simulation step:', stepRef.current, 'Type:', simulationType)
      
      const currentStep = stepRef.current
      const device = webGPUState.device
      
      // Debug: log the current buffer states
      console.log('Current step:', currentStep, 'Using bind group:', currentStep % 2 === 0 ? 'A' : 'B')
      
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
        
        // Debug: check if data is changing
        const activeCells = newStates.filter(val => val > 0.5).length
        const avgValue = newStates.reduce((sum, val) => sum + val, 0) / newStates.length
        console.log('Step', currentStep, '- Active cells:', activeCells, 'Avg value:', avgValue.toFixed(4), 'First few values:', newStates.slice(0, 5))
        
        // Copy the data before unmapping to avoid detached ArrayBuffer
        const copiedStates = new Float32Array(newStates)
        
        // Queue the update for the next frame
        setPendingUpdate(copiedStates)
        console.log('Queued update for next frame')
        
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
      console.log('Setting up instance attributes with', cellStates.length, 'cells')
      geometry.setAttribute('instanceState', new THREE.InstancedBufferAttribute(cellStates, 1))
    }
  }, [geometry, cellStates])

  // Reset simulation effect
  useEffect(() => {
    if (!resetFlag || !webGPUState.isInitialized) return

    console.log('Resetting simulation state...')
    
    // Create new random cell states
    const newCellStates = new Float32Array(GRID_SIZE * GRID_SIZE)
    for (let i = 0; i < newCellStates.length; i++) {
      newCellStates[i] = Math.random() > 0.6 ? 1.0 : 0.0
    }

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
    
    console.log('Simulation reset complete')
  }, [resetFlag, webGPUState.isInitialized, webGPUState.device, webGPUState.cellStateStorageA, webGPUState.cellStateStorageB])

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