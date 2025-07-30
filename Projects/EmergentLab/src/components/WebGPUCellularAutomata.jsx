import React, { useRef, useEffect, useState } from 'react'

const WebGPUCellularAutomata = () => {
  const canvasRef = useRef()
  const animationFrameRef = useRef()
  const intervalRef = useRef()
  
  // Grid configuration
  const GRID_SIZE = 32
  const UPDATE_INTERVAL = 200 // Update every 200ms (5 times/sec)
  
  const [webGPUState, setWebGPUState] = useState({
    device: null,
    context: null,
    canvasFormat: null,
    isInitialized: false,
    error: null,
    // Geometry rendering state
    vertexBuffer: null,
    vertexBufferLayout: null,
    cellShaderModule: null,
    cellPipeline: null,
    // Grid rendering state
    uniformBuffer: null,
    bindGroups: null,
    // Cell state management
    cellStateStorage: null,
    step: 0
  })

  useEffect(() => {
    const initializeWebGPU = async () => {
      try {
        // Check if WebGPU is supported
        if (!navigator.gpu) {
          throw new Error("WebGPU not supported on this browser.")
        }

        // Request adapter
        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) {
          throw new Error("No appropriate GPUAdapter found.")
        }

        // Request device
        const device = await adapter.requestDevice()

        // Get canvas context and configure it
        const canvas = canvasRef.current
        const context = canvas.getContext("webgpu")
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
        
        context.configure({
          device: device,
          format: canvasFormat,
        })

        // Define vertices for a square (two triangles)
        const vertices = new Float32Array([
          //   X,    Y,
          -0.8, -0.8, // Triangle 1
           0.8, -0.8,
           0.8,  0.8,

          -0.8, -0.8, // Triangle 2
           0.8,  0.8,
          -0.8,  0.8,
        ])

        // Create vertex buffer
        const vertexBuffer = device.createBuffer({
          label: "Cell vertices",
          size: vertices.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        })

        // Copy vertex data into buffer
        device.queue.writeBuffer(vertexBuffer, 0, vertices)

        // Define vertex buffer layout
        const vertexBufferLayout = {
          arrayStride: 8,
          attributes: [{
            format: "float32x2",
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
          }],
        }

        // Create a uniform buffer that describes the grid
        const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE])
        const uniformBuffer = device.createBuffer({
          label: "Grid Uniforms",
          size: uniformArray.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        device.queue.writeBuffer(uniformBuffer, 0, uniformArray)

        // Create an array representing the active state of each cell
        const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE)

        // Create two storage buffers to hold the cell state (ping-pong pattern)
        const cellStateStorage = [
          device.createBuffer({
            label: "Cell State A",
            size: cellStateArray.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          }),
          device.createBuffer({
            label: "Cell State B",
            size: cellStateArray.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          })
        ]

        // Mark every third cell of the first grid as active
        for (let i = 0; i < cellStateArray.length; i += 3) {
          cellStateArray[i] = 1
        }
        device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray)

        // Mark every other cell of the second grid as active
        for (let i = 0; i < cellStateArray.length; i++) {
          cellStateArray[i] = i % 2
        }
        device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray)

        // Create shader module with cell state support
        const cellShaderModule = device.createShaderModule({
          label: "Cell shader",
          code: `
            struct VertexInput {
              @location(0) pos: vec2f,
              @builtin(instance_index) instance: u32,
            };

            struct VertexOutput {
              @builtin(position) pos: vec4f,
              @location(0) cell: vec2f,
            };

            @group(0) @binding(0) var<uniform> grid: vec2f;
            @group(0) @binding(1) var<storage> cellState: array<u32>;

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
              let i = f32(input.instance);
              let cell = vec2f(i % grid.x, floor(i / grid.x));
              let state = f32(cellState[input.instance]);

              let cellOffset = cell / grid * 2;
              // Scale the position by the cell's active state
              let gridPos = (input.pos * state + 1) / grid - 1 + cellOffset;
              
              var output: VertexOutput;
              output.pos = vec4f(gridPos, 0, 1);
              output.cell = cell;
              return output;
            }

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
              let c = input.cell / grid;
              return vec4f(c, 1-c.x, 1);
            }
          `
        })

        // Create render pipeline
        const cellPipeline = device.createRenderPipeline({
          label: "Cell pipeline",
          layout: "auto",
          vertex: {
            module: cellShaderModule,
            entryPoint: "vertexMain",
            buffers: [vertexBufferLayout]
          },
          fragment: {
            module: cellShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
              format: canvasFormat
            }]
          }
        })

        // Create bind groups for ping-pong pattern
        const bindGroups = [
          device.createBindGroup({
            label: "Cell renderer bind group A",
            layout: cellPipeline.getBindGroupLayout(0),
            entries: [{
              binding: 0,
              resource: { buffer: uniformBuffer }
            }, {
              binding: 1,
              resource: { buffer: cellStateStorage[0] }
            }],
          }),
          device.createBindGroup({
            label: "Cell renderer bind group B",
            layout: cellPipeline.getBindGroupLayout(0),
            entries: [{
              binding: 0,
              resource: { buffer: uniformBuffer }
            }, {
              binding: 1,
              resource: { buffer: cellStateStorage[1] }
            }],
          })
        ]

        setWebGPUState({
          device,
          context,
          canvasFormat,
          isInitialized: true,
          error: null,
          vertexBuffer,
          vertexBufferLayout,
          cellShaderModule,
          cellPipeline,
          uniformBuffer,
          bindGroups,
          cellStateStorage,
          step: 0
        })

        console.log(`WebGPU initialized successfully with cell state management!`)
      } catch (error) {
        console.error("WebGPU initialization failed:", error)
        setWebGPUState(prev => ({
          ...prev,
          error: error.message
        }))
      }
    }

    initializeWebGPU()
  }, [])

  useEffect(() => {
    if (!webGPUState.isInitialized || webGPUState.error) return

    // Update grid function for render loop
    const updateGrid = () => {
      const { device, context, cellPipeline, vertexBuffer, bindGroups, step } = webGPUState

      // Create command encoder
      const encoder = device.createCommandEncoder()

      // Begin render pass
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0.4, a: 1 }, // Dark blue background
          storeOp: "store",
        }]
      })

      // Draw the grid
      pass.setPipeline(cellPipeline)
      pass.setBindGroup(0, bindGroups[step % 2]) // Ping-pong between bind groups
      pass.setVertexBuffer(0, vertexBuffer)
      pass.draw(6, GRID_SIZE * GRID_SIZE) // 6 vertices, GRID_SIZE * GRID_SIZE instances

      // End the render pass
      pass.end()

      // Submit the command buffer
      device.queue.submit([encoder.finish()])

      // Update step count
      setWebGPUState(prev => ({
        ...prev,
        step: prev.step + 1
      }))
    }

    // Start the render loop with setInterval
    intervalRef.current = setInterval(updateGrid, UPDATE_INTERVAL)

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [webGPUState.isInitialized, webGPUState.error])

  if (webGPUState.error) {
    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'white',
        textAlign: 'center',
        fontFamily: 'monospace',
        maxWidth: '600px',
        padding: '20px'
      }}>
        <h2>WebGPU Error</h2>
        <p>{webGPUState.error}</p>
        <p>Please use a browser that supports WebGPU:</p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>Chrome Canary (with WebGPU flag enabled)</li>
          <li>Edge Canary (with WebGPU flag enabled)</li>
          <li>Firefox Nightly (with WebGPU flag enabled)</li>
        </ul>
        <p style={{ marginTop: '20px', fontSize: '14px' }}>
          To enable WebGPU in Chrome Canary:<br/>
          1. Go to chrome://flags/<br/>
          2. Search for "WebGPU"<br/>
          3. Enable "Unsafe WebGPU"<br/>
          4. Restart browser
        </p>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={512}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        border: '1px solid #333',
        display: 'block'
      }}
    />
  )
}

export default WebGPUCellularAutomata 