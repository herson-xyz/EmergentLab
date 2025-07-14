# R3F + WebGPU + WGSL Boilerplate

This project demonstrates how to set up React Three Fiber (R3F) with WebGPU support and WGSL shaders.

## Features

- ✅ **WebGPU Detection**: Automatically detects WebGPU support
- ✅ **WebGL Fallback**: Gracefully falls back to WebGL if WebGPU is not available
- ✅ **Custom Shaders**: Animated GLSL shaders with time-based effects
- ✅ **WebGPU-Ready**: Configured for future WebGPU renderer support
- ✅ **Performance Optimized**: High-performance settings and proper device selection

## WebGPU Support

### Current Status
- **WebGPU Renderer**: Not yet available in stable Three.js
- **WebGPU Context**: Available and detected
- **WGSL Shaders**: Using GLSL with WebGPU-ready structure
- **Fallback**: WebGL renderer with WebGPU-compatible settings

### Browser Support
WebGPU is currently supported in:
- Chrome Canary (with flags enabled)
- Edge Canary
- Firefox Nightly (experimental)

### To Enable WebGPU in Chrome Canary:
1. Install Chrome Canary
2. Navigate to `chrome://flags/`
3. Enable "Unsafe WebGPU"
4. Restart browser

## Project Structure

```
src/
├── components/
│   └── WebGPUInfo.jsx          # WebGPU status display
├── shaders/
│   └── wgsl-shader.js          # Custom shader materials
├── Experience.js               # Main 3D scene
├── webgpu-renderer.js          # WebGPU renderer setup
└── index.jsx                   # App entry point
```

## Custom Shaders

The project includes two shader materials:

### 1. AnimatedShaderMaterial
- **Vertex Shader**: Animated vertex displacement
- **Fragment Shader**: Dynamic color changes with lighting
- **Features**: Time-based animation, UV-based color variation

### 2. WebGPUCompatibleMaterial
- **Type**: Standard Three.js material
- **Features**: Animated color and emissive properties
- **Compatibility**: Works with both WebGL and WebGPU

## Usage

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## WebGPU Implementation Notes

### Current Approach
1. **WebGPU Context Detection**: Checks for `navigator.gpu`
2. **Adapter Selection**: Requests high-performance adapter
3. **Device Creation**: Creates WebGPU device
4. **Renderer Configuration**: Uses WebGL with WebGPU-compatible settings

### Future WebGPU Renderer
When Three.js WebGPU renderer becomes available:
1. Replace `THREE.WebGLRenderer` with `THREE.WebGPURenderer`
2. Convert GLSL shaders to WGSL
3. Update material bindings for WebGPU

### WGSL Shader Structure
```wgsl
// Example WGSL structure (for future use)
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
    // WGSL vertex processing
}
```

## Performance Considerations

- **Device Pixel Ratio**: Limited to [1, 2] for WebGPU compatibility
- **Power Preference**: Set to "high-performance"
- **Antialiasing**: Enabled for quality
- **Shadow Maps**: PCF soft shadows for realistic lighting

## Troubleshooting

### WebGPU Not Available
- Check browser support
- Enable experimental flags
- Verify hardware compatibility

### Shader Compilation Errors
- Check GLSL syntax
- Verify uniform bindings
- Ensure proper varying declarations

### Performance Issues
- Reduce geometry complexity
- Optimize shader calculations
- Check device capabilities

## Resources

- [WebGPU Specification](https://gpuweb.github.io/gpuweb/)
- [Three.js WebGPU](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/renderers/webgpu)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [WGSL Reference](https://gpuweb.github.io/gpuweb/wgsl/) 