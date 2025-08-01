import React from 'react'
import { Canvas, extend } from '@react-three/fiber'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three/webgpu'
import { MainScene } from './components'
import { MAIN_CAMERA } from './constants/camera'

extend(THREE)

const root = createRoot(document.getElementById('root'))
root.render(
    <Canvas
        camera={{ 
          position: MAIN_CAMERA.position, 
          fov: MAIN_CAMERA.fov 
        }}
        style={{ width: '100vw', height: '100vh', background: 'white' }}
        gl={async (props) => {
            const renderer = new THREE.WebGPURenderer(props)
            await renderer.init()

            // ✅ Ensure sRGB color space is used
            renderer.outputColorSpace = THREE.SRGBColorSpace

            // ✅ Disable tone mapping that dulls whites
            renderer.toneMapping = THREE.NoToneMapping

            // ✅ Set white background
            renderer.setClearColor(0x000000)
            //            renderer.setClearColor(0xccccff)

            return renderer
        }}
    >
        <MainScene />
    </Canvas>
)
