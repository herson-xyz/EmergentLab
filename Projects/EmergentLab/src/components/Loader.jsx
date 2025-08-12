import React from 'react'
import { Html, useProgress } from '@react-three/drei'

export default function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div style={{
        padding: '8px 12px',
        borderRadius: 8,
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        fontSize: 14,
        letterSpacing: 0.5
      }}>
        Loading… {Math.round(progress)}%
      </div>
    </Html>
  )
} 