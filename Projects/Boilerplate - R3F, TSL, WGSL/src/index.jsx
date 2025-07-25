import React, { useRef, useState } from 'react'
import { Canvas, extend } from '@react-three/fiber'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three/webgpu'
import SmoothLifeSimulation from './SmoothLifeSimulation'
import { OrbitControls } from '@react-three/drei'
import RefractionMesh from './components/RefractionMesh'
import RenderTargetPass from './components/RenderTargetPass'
import FullscreenQuad from './components/FullscreenQuad'

extend(THREE)

function MainScene() {
  const renderTargetRef = useRef();
  const [texture, setTexture] = useState();
  return (
    <>
      <RenderTargetPass renderTargetRef={renderTargetRef} setTexture={setTexture} />
      <ambientLight intensity={0.2} />
      <RefractionMesh />
      <SmoothLifeSimulation />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <FullscreenQuad texture={texture} />
    </>
  );
}

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
            renderer.setClearColor(0x000000)
            //            renderer.setClearColor(0xccccff)

            return renderer
        }}
    >
        <MainScene />
    </Canvas>
)
