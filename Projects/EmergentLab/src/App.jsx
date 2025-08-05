import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Leva } from 'leva'
import PostProcessing from './components/PostProcessing'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Leva />
      <Canvas
        camera={{ position: [0, 0, 2], fov: 15 }}
        style={{ background: '#000' }}
      >
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5}
          maxDistance={20}
        />
        <PostProcessing />
      </Canvas>
    </div>
  )
}

export default App 