import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { Preload } from '@react-three/drei'
import MainScene from './components/MainScene'
import Loader from './components/Loader'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Leva />
      <Canvas
        shadows
        camera={{ position: [0, 0, 2], fov: 15 }}
        style={{ background: '#000' }}
      >
        <Suspense fallback={<Loader />}>
          <MainScene />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App 