import React, { useRef, useEffect, useState } from 'react'

const WebGPUCellularAutomata = () => {
  const canvasRef = useRef()
  const animationFrameRef = useRef()
  
  // Grid configuration
  const GRID_SIZE = 32
  
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
    bindGroup: null
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

        // Create shader module with grid support
        const cellShaderModule = device.createShaderModule({
          label: "Cell shader",
          code: `
            @group(0) @binding(0) var<uniform> grid: vec2f;

            @vertex
            fn vertexMain(@location(0) pos: vec2f,
                          @builtin(instance_index) instance: u32) ->
              @builtin(position) vec4f {

              let i = f32(instance);
              // Compute the cell coordinate from the instance_index
              let cell = vec2f(i % grid.x, floor(i / grid.x));

              let cellOffset = cell / grid * 2;
              let gridPos = (pos + 1) / grid - 1 + cellOffset;

              return vec4f(gridPos, 0, 1);
            }

            @fragment
            fn fragmentMain() -> @location(0) vec4f {
              return vec4f(1, 0, 0, 1); // Red color
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

        // Create bind group
        const bindGroup = device.createBindGroup({
          label: "Cell renderer bind group",
          layout: cellPipeline.getBindGroupLayout(0),
          entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
          }],
        })

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
          bindGroup
        })

        console.log(`WebGPU initialized successfully with ${GRID_SIZE}x${GRID_SIZE} grid rendering!`)
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

    const render = () => {
      const { device, context, cellPipeline, vertexBuffer, bindGroup } = webGPUState

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
      pass.setVertexBuffer(0, vertexBuffer)
      pass.setBindGroup(0, bindGroup)
      pass.draw(6, GRID_SIZE * GRID_SIZE) // 6 vertices, GRID_SIZE * GRID_SIZE instances

      // End the render pass
      pass.end()

      // Submit the command buffer
      device.queue.submit([encoder.finish()])

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(render)
    }

    // Start the render loop
    render()

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
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