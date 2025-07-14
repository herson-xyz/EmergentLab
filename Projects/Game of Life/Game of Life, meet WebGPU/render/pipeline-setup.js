export function createVertexBuffer(device, vertices) {
    const vertexBuffer = device.createBuffer({
        label: "Cell vertices",
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    
    device.queue.writeBuffer(vertexBuffer, 0, vertices);
    return vertexBuffer;
}

export const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [{
        format: "float32x2",
        offset: 0,
        shaderLocation: 0,
    }],
};

export function createRenderPipeline(device, shaderSource, canvasFormat) {
    const cellShaderModule = device.createShaderModule({
        label: 'Cell shader',
        code: shaderSource
    });

    return device.createRenderPipeline({
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
    });
}

export function createSquareVertices() {
    return new Float32Array([
        //   X,    Y,
          -0.8, -0.8, // Triangle 1
           0.8, -0.8,
           0.8,  0.8,
        
          -0.8, -0.8, // Triangle 2
           0.8,  0.8,
          -0.8,  0.8,
    ]);
} 