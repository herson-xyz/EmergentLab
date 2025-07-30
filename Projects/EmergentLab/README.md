# WebGPU Cellular Automata

A React application for continuous cellular automata simulations using WebGPU. This project converts a Game of Life WebGPU implementation into a modular React app.

## Features

- WebGPU-powered cellular automata simulations
- React integration with direct WebGPU rendering
- Modular architecture for easy expansion
- Game of Life as the first simulation type

## Prerequisites

- Node.js (v16 or higher)
- A browser with WebGPU support:
  - Chrome Canary (with WebGPU flag enabled)
  - Edge Canary (with WebGPU flag enabled)
  - Firefox Nightly (with WebGPU flag enabled)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Current Status

**Module 2 Complete**: Geometry rendering with vertex buffers, shaders, and render pipeline.

The app currently:
- ✅ Initializes WebGPU device and adapter
- ✅ Configures canvas for WebGPU rendering
- ✅ Creates vertex buffers with square geometry (two triangles)
- ✅ Implements vertex and fragment shaders in WGSL
- ✅ Sets up render pipeline with proper vertex layout
- ✅ Renders a red square on dark blue background
- ✅ Uses requestAnimationFrame for smooth rendering
- ✅ Handles WebGPU support errors gracefully

## Project Structure

```
src/
├── components/
│   └── WebGPUCellularAutomata.jsx  # Main WebGPU component
├── App.jsx                          # Main app component
├── main.jsx                         # React entry point
└── index.css                        # Global styles
```

## Technical Details

### Module 2 Implementation:
- **Vertex Buffer**: 6 vertices defining a square (2 triangles)
- **Vertex Layout**: 8-byte stride with float32x2 position format
- **Vertex Shader**: Transforms 2D positions to clip space
- **Fragment Shader**: Outputs solid red color (vec4f(1, 0, 0, 1))
- **Render Pipeline**: Configured with auto layout and proper targets

### Coordinate System:
- Uses Normalized Device Coordinates (NDC)
- Canvas center at (0, 0)
- Square vertices at (-0.8, -0.8) to (0.8, 0.8)

## Next Steps

The project is ready for the next module. Each module will build upon the previous one, adding new functionality like:
- Compute shaders for simulation logic
- Game of Life rules implementation
- Grid-based rendering system
- Animation and state management

## Browser Support

WebGPU is still an experimental technology. To enable it:

**Chrome Canary:**
1. Go to `chrome://flags/`
2. Search for "WebGPU"
3. Enable "Unsafe WebGPU"
4. Restart browser

**Edge Canary:**
1. Go to `edge://flags/`
2. Search for "WebGPU"
3. Enable "Unsafe WebGPU"
4. Restart browser

## Development

This project uses:
- React 18
- Vite for build tooling
- WebGPU for GPU-accelerated computations
- WGSL (WebGPU Shading Language) for shaders
- Direct canvas rendering (no Three.js dependency) 