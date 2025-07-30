# WebGPU Cellular Automata

A React application for continuous cellular automata simulations using WebGPU. This project converts a Game of Life WebGPU implementation into a modular React app.

## Features

- WebGPU-powered cellular automata simulations
- React integration with direct WebGPU rendering
- Modular architecture for easy expansion
- Game of Life as the first simulation type
- Colorful gradient visualization
- Cell state management with ping-pong buffers

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

**Module 4 Complete**: Cell state management with storage buffers and ping-pong pattern.

The app currently:
- ✅ Initializes WebGPU device and adapter
- ✅ Configures canvas for WebGPU rendering
- ✅ Creates vertex buffers with square geometry (two triangles)
- ✅ Implements vertex and fragment shaders in WGSL using structs
- ✅ Sets up render pipeline with proper vertex layout
- ✅ Creates uniform buffer for grid size (32x32)
- ✅ Implements bind groups for shader resource binding
- ✅ Uses instancing to render 1024 squares in a grid pattern
- ✅ Passes cell coordinates from vertex to fragment shader
- ✅ Renders colorful gradients based on cell position
- ✅ Creates storage buffers for cell state management
- ✅ Implements ping-pong pattern with two state buffers
- ✅ Uses cell state to control square visibility (scaling)
- ✅ Implements render loop with setInterval (200ms updates)
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

### Module 4 Implementation:
- **Storage Buffers**: Two Uint32Array buffers for cell state (ping-pong pattern)
- **Cell State**: 1 = active (visible), 0 = inactive (collapsed to point)
- **Ping-Pong Pattern**: Alternates between two state buffers each frame
- **Vertex Scaling**: Squares scaled by cell state (`pos * state`)
- **Render Loop**: Updates every 200ms using setInterval
- **Bind Groups**: Two bind groups for alternating state buffers

### Cell State Patterns:
- **Buffer A**: Every third cell active (diagonal stripes)
- **Buffer B**: Every other cell active (checkerboard pattern)

### Vertex Shader Cell State Integration:
```wgsl
let state = f32(cellState[input.instance]);
let gridPos = (input.pos * state + 1) / grid - 1 + cellOffset;
```

### Ping-Pong Pattern:
```javascript
pass.setBindGroup(0, bindGroups[step % 2]); // Alternates between 0 and 1
```

### Color Algorithm:
```wgsl
let c = input.cell / grid;
return vec4f(c, 1-c.x, 1);
```
- **Red Channel**: `c.x` (0 to 1 across X-axis)
- **Green Channel**: `c.y` (0 to 1 across Y-axis)  
- **Blue Channel**: `1-c.x` (brightest where red is darkest)
- **Alpha**: Always 1 (fully opaque)

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

You should see a **32x32 grid that alternates between two patterns** every 200ms:
- **Pattern A**: Diagonal stripes of colorful squares
- **Pattern B**: Checkerboard pattern of colorful squares
- **Inactive cells**: Collapsed to invisible points
- **Active cells**: Full colorful squares with gradients

This demonstrates:
- Successful storage buffer integration with shaders
- Proper ping-pong pattern implementation
- Cell state controlling geometry visibility
- Smooth animation loop with controlled timing

## Next Steps

The project is ready for the next module. Each module will build upon the previous one, adding new functionality like:
- Compute shaders for Game of Life simulation logic
- Conway's Game of Life rules implementation
- Dynamic cell state updates based on neighbor calculations
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