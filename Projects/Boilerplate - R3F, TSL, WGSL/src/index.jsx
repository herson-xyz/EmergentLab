import React from 'react'
import { Canvas, extend } from '@react-three/fiber'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three/webgpu'
import SmoothLifeSimulation from './SmoothLifeSimulation'

extend(THREE)

const root = createRoot(document.getElementById('root'))
root.render(
    <Canvas
        style={{ width: '100vw', height: '100vh', background: 'white' }}
        gl={async (props) => {
            const renderer = new THREE.WebGPURenderer(props)
            await renderer.init()

            // ✅ Ensure sRGB color space is used
            renderer.outputColorSpace = THREE.SRGBColorSpace

            // ✅ Disable tone mapping that dulls whites
            renderer.toneMapping = THREE.NoToneMapping

            // ✅ Set white background
            renderer.setClearColor(0xffffff)

            return renderer
        }}
    >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
        <SmoothLifeSimulation />
    </Canvas>
)
