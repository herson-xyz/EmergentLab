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

**Module 1 Complete**: Basic WebGPU setup with canvas initialization and clearing functionality.

The app currently:
- ✅ Initializes WebGPU device and adapter
- ✅ Configures canvas for WebGPU rendering
- ✅ Clears the canvas with a dark blue color
- ✅ Handles WebGPU support errors gracefully
- ✅ Uses requestAnimationFrame for smooth rendering

## Project Structure

```
src/
├── components/
│   └── WebGPUCellularAutomata.jsx  # Main WebGPU component
├── App.jsx                          # Main app component
├── main.jsx                         # React entry point
└── index.css                        # Global styles
```

## Next Steps

The project is ready for the next module. Each module will build upon the previous one, adding new functionality like:
- Vertex buffers and shaders
- Compute shaders for simulation logic
- Game of Life rules implementation
- Animation and rendering pipeline

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
- Direct canvas rendering (no Three.js dependency) 