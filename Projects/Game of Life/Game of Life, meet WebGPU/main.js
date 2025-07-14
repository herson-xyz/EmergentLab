import { initializeWebGPU } from './webgpu-setup.js';
import { cellShaderSource } from './shaders/cell-shader.js';
import { createVertexBuffer, createRenderPipeline, createSquareVertices } from './render/pipeline-setup.js';

async function main() {
    const canvas = document.querySelector("canvas");
    const { device, context, canvasFormat } = await initializeWebGPU(canvas);

    const vertices = createSquareVertices();
    const vertexBuffer = createVertexBuffer(device, vertices);
    const cellPipeline = createRenderPipeline(device, cellShaderSource, canvasFormat);

    // Render pass
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0.4, a: 1 }
        }]
    });

    pass.setPipeline(cellPipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(vertices.length / 2);
    
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

main(); 