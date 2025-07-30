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
  
  // Get simulation type from Leva controls
  const { simulationType } = useSimulationSelector()
  
  // Debug: log the simulation type
  console.log('Current simulation type:', simulationType)
  
  // Trigger initial reset on mount
  useEffect(() => {
    setResetFlag(true)
  }, [])
  
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
        
        // Create cell state arrays
        const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE)
        for (let i = 0; i < cellStateArray.length; i++) {
          cellStateArray[i] = Math.random() > 0.6 ? 1 : 0
        }

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

        // Create compute shader
        const simulationShaderModule = device.createShaderModule({
          code: `
            @group(0) @binding(0) var<uniform> grid: vec2f;
            @group(0) @binding(1) var<storage> cellStateIn: array<u32>;
            @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

            fn cellIndex(cell: vec2u) -> u32 {
              return cell.y * u32(grid.x) + cell.x;
            }

            fn cellActive(x: u32, y: u32) -> u32 {
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

              switch activeNeighbors {
                case 2: {
                  cellStateOut[i] = cellStateIn[i];
                }
                case 3: {
                  cellStateOut[i] = 1;
                }
                default: {
                  cellStateOut[i] = 0;
                }
              }
            }
          `
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
          cellStateArray
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
  }, [])

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
          if (vState < 0.5) {
            discard; // Don't render inactive cells
          }
          
          // Color based on cell position
          vec2 grid = vec2(${GRID_SIZE}.0, ${GRID_SIZE}.0);
          vec2 c = vCell / grid;
          gl_FragColor = vec4(c, 1.0 - c.x, 1.0);
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
        const newStates = new Uint32Array(readBuffer.getMappedRange())
        const floatStates = new Float32Array(newStates.length)
        for (let i = 0; i < newStates.length; i++) {
          floatStates[i] = newStates[i]
        }
        
        // Update the material's instance state attribute
        if (meshRef.current) {
          const instanceStateAttribute = meshRef.current.geometry.getAttribute('instanceState')
          if (instanceStateAttribute) {
            instanceStateAttribute.array = floatStates
            instanceStateAttribute.needsUpdate = true
          }
        }
        
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

    console.log('Resetting simulation state...')
    
    // Create new random cell states
    const newCellStates = new Float32Array(GRID_SIZE * GRID_SIZE)
    for (let i = 0; i < newCellStates.length; i++) {
      newCellStates[i] = Math.random() > 0.6 ? 1.0 : 0.0
    }

    // Update WebGPU buffers
    if (webGPUState.device && webGPUState.cellStateStorageA && webGPUState.cellStateStorageB) {
      webGPUState.device.queue.writeBuffer(webGPUState.cellStateStorageA, 0, new Uint32Array(newCellStates))
      webGPUState.device.queue.writeBuffer(webGPUState.cellStateStorageB, 0, new Uint32Array(newCellStates))
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
    />
  )
} 