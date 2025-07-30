# WebGPU Cellular Automata

A React application for continuous cellular automata simulations using WebGPU. This project converts a Game of Life WebGPU implementation into a modular React app.

## Features

- WebGPU-powered cellular automata simulations
- React integration with direct WebGPU rendering
- Modular architecture for easy expansion
- Conway's Game of Life simulation with compute shaders
- Colorful gradient visualization
- Cell state management with ping-pong buffers
- Real-time simulation updates

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

**Final Module Complete**: Conway's Game of Life simulation with compute shaders.

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
- ✅ Implements compute shaders for Game of Life simulation
- ✅ Applies Conway's Game of Life rules with neighbor counting
- ✅ Uses workgroups for efficient GPU parallelization
- ✅ Implements render loop with compute and render passes
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

### Final Implementation:
- **Compute Shaders**: WGSL compute shader with 8x8 workgroups
- **Game of Life Rules**: Conway's classic cellular automaton rules
- **Neighbor Counting**: 8-neighbor Moore neighborhood with wrap-around
- **Random Initialization**: 40% cell density for interesting patterns
- **Dual Pipeline**: Compute pipeline for simulation, render pipeline for visualization
- **Shared Resources**: Bind group layout shared between compute and render pipelines

### Conway's Game of Life Rules:
```wgsl
switch activeNeighbors {
  case 2: { // Active cells with 2 neighbors stay active
    cellStateOut[i] = cellStateIn[i];
  }
  case 3: { // Cells with 3 neighbors become or stay active
    cellStateOut[i] = 1;
  }
  default: { // Cells with < 2 or > 3 neighbors become inactive
    cellStateOut[i] = 0;
  }
}
```

### Compute Shader Features:
- **Workgroup Size**: 8x8 (64 invocations per workgroup)
- **Grid Wrap-around**: Toroidal surface using modulo operations
- **Neighbor Function**: `cellActive(x, y)` for clean neighbor access
- **Index Calculation**: `cellIndex(cell)` for 2D to 1D mapping

### Pipeline Architecture:
- **Bind Group Layout**: Explicit layout with 3 bindings (uniform, input, output)
- **Pipeline Layout**: Shared between compute and render pipelines
- **Resource Sharing**: Uniform and storage buffers accessible to both pipelines
- **Ping-Pong Pattern**: Alternating input/output buffers for simulation steps

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

You should see a **32x32 grid running Conway's Game of Life simulation** with:
- **Random Initial Pattern**: 40% of cells start active
- **Live Evolution**: Cells follow Conway's rules every 250ms
- **Colorful Visualization**: Active cells show gradient colors based on position
- **Wrap-around Edges**: Grid behaves like a toroidal surface
- **Smooth Animation**: Compute shader updates, render shader visualizes

This demonstrates:
- Complete WebGPU compute and render pipeline integration
- Real-time cellular automaton simulation
- Efficient GPU parallelization with workgroups
- Proper resource management and state synchronization

## Game of Life Patterns

The simulation will exhibit classic Game of Life behaviors:
- **Still Lifes**: Stable patterns that don't change
- **Oscillators**: Patterns that repeat in cycles
- **Spaceships**: Patterns that move across the grid
- **Gliders**: Small spaceships that move diagonally
- **Chaos**: Complex evolving patterns

## Next Steps

The project is now complete with a fully functional Game of Life simulation! Future enhancements could include:
- Interactive controls (pause, reset, speed adjustment)
- Different initial patterns (glider gun, random, etc.)
- Multiple cellular automaton rules
- 3D visualization or larger grids
- Performance optimizations

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