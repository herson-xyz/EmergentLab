import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CRTShaderMaterial } from './'

export default function CRTTestQuad() {
  const { size } = useThree()
  
  // Create a simple test texture
  const testTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    
    // Create a gradient pattern
    const gradient = ctx.createLinearGradient(0, 0, 256, 256)
    gradient.addColorStop(0, '#ff0000')
    gradient.addColorStop(0.5, '#00ff00')
    gradient.addColorStop(1, '#0000ff')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
    
    // Add some circles for testing
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(64, 64, 32, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = '#ffff00'
    ctx.beginPath()
    ctx.arc(192, 192, 48, 0, Math.PI * 2)
    ctx.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.flipY = false
    return texture
  }, [])

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <CRTShaderMaterial 
        inputTexture={testTexture}
        scanlineIntensity={0.2}
        scanlineCount={240}
      />
    </mesh>
  )
} 