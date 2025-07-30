import React, { useRef, useEffect, useState } from 'react'

const WebGPUCellularAutomata = () => {
  const canvasRef = useRef()
  const animationFrameRef = useRef()
  const [webGPUState, setWebGPUState] = useState({
    device: null,
    context: null,
    canvasFormat: null,
    isInitialized: false,
    error: null
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

        setWebGPUState({
          device,
          context,
          canvasFormat,
          isInitialized: true,
          error: null
        })

        console.log("WebGPU initialized successfully!")
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
      const { device, context } = webGPUState

      // Create command encoder
      const encoder = device.createCommandEncoder()

      // Begin render pass
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0.4, a: 1 }, // Dark blue color
          storeOp: "store",
        }]
      })

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