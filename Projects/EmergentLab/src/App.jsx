import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import MainScene from './components/MainScene'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Leva />
      <Canvas
        camera={{ position: [0, 0, 2], fov: 15 }}
        style={{ background: '#000' }}
      >
        <MainScene />
      </Canvas>
    </div>
  )
}

export default App 