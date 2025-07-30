import React, { useRef, useEffect, useState } from 'react'

const WebGPUCellularAutomata = () => {
  const canvasRef = useRef()
  const animationFrameRef = useRef()
  const [webGPUState, setWebGPUState] = useState({
    device: null,
    context: null,
    canvasFormat: null,
    isInitialized: false,
    error: null,
    // New state for geometry rendering
    vertexBuffer: null,
    vertexBufferLayout: null,
    cellShaderModule: null,
    cellPipeline: null
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
          -0.8, -0.8, // Triangle 1 (Blue)
           0.8, -0.8,
           0.8,  0.8,

          -0.8, -0.8, // Triangle 2 (Red)
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

        // Create shader module
        const cellShaderModule = device.createShaderModule({
          label: "Cell shader",
          code: `
            @vertex
            fn vertexMain(@location(0) pos: vec2f) ->
              @builtin(position) vec4f {
              return vec4f(pos, 0, 1);
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

        setWebGPUState({
          device,
          context,
          canvasFormat,
          isInitialized: true,
          error: null,
          vertexBuffer,
          vertexBufferLayout,
          cellShaderModule,
          cellPipeline
        })

        console.log("WebGPU initialized successfully with geometry rendering!")
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
      const { device, context, cellPipeline, vertexBuffer } = webGPUState

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

      // Draw the square
      pass.setPipeline(cellPipeline)
      pass.setVertexBuffer(0, vertexBuffer)
      pass.draw(6) // 6 vertices (2 triangles)

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