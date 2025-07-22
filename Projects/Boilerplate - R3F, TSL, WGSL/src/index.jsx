import React from 'react'
import { Canvas, extend } from '@react-three/fiber'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three/webgpu'
import SmoothLifeSimulation from './SmoothLifeSimulation'
import { Environment, OrbitControls } from '@react-three/drei'
import RefractionMesh from './components/RefractionMesh'
extend(THREE)

const root = createRoot(document.getElementById('root'))
root.render(
    <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
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
        <RefractionMesh />
        <SmoothLifeSimulation />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
)
