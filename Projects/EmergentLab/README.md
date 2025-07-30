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

**Module 3 Complete**: Grid rendering with uniforms, bind groups, and instancing.

The app currently:
- ✅ Initializes WebGPU device and adapter
- ✅ Configures canvas for WebGPU rendering
- ✅ Creates vertex buffers with square geometry (two triangles)
- ✅ Implements vertex and fragment shaders in WGSL
- ✅ Sets up render pipeline with proper vertex layout
- ✅ Creates uniform buffer for grid size (32x32)
- ✅ Implements bind groups for shader resource binding
- ✅ Uses instancing to render 1024 squares in a grid pattern
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

### Module 3 Implementation:
- **Grid Size**: 32x32 cells (1024 total squares)
- **Uniform Buffer**: Contains grid dimensions for shader access
- **Bind Group**: Connects uniform buffer to shader at binding 0
- **Instancing**: Single draw call renders all 1024 squares
- **Vertex Shader**: Uses instance_index to position each square in grid
- **Fragment Shader**: Outputs solid red color for all squares

### Grid Positioning Algorithm:
```wgsl
let i = f32(instance);
let cell = vec2f(i % grid.x, floor(i / grid.x));
let cellOffset = cell / grid * 2;
let gridPos = (pos + 1) / grid - 1 + cellOffset;
```

### Coordinate System:
- Uses Normalized Device Coordinates (NDC)
- Grid starts at bottom-left corner
- Each cell is positioned using instance_index calculation
- Canvas divided into 32x32 equal cells

## Visual Result

You should see a **32x32 grid of red squares** on a **dark blue background**, demonstrating:
- Successful uniform buffer communication with shaders
- Proper bind group resource binding
- Efficient instanced rendering of 1024 squares
- Correct grid positioning using instance_index

## Next Steps

The project is ready for the next module. Each module will build upon the previous one, adding new functionality like:
- Compute shaders for simulation logic
- Game of Life rules implementation
- Cell state management and animation
- Interactive controls and visualization

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