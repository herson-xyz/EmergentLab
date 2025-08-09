import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import ArcadeScreenMesh from './ArcadeScreenMesh'

export default function ArcadeScene({ texture, enabled }) {
  const testRef = useRef()

  useFrame(() => {
    if (testRef.current) {
      testRef.current.rotation.y += 0.01
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {enabled && texture ? (
        <ArcadeScreenMesh texture={texture} />
      ) : (
        <mesh>
          <boxGeometry args={[0.5, 0.3, 0.05]} />
          <meshBasicMaterial color={'#222'} />
        </mesh>
      )}

      {enabled && (
        <>
          {/* Test geometry: rotating cube to verify world rendering */}
          <mesh ref={testRef} position={[0.9, 0, 0]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color={'hotpink'} />
          </mesh>

          {/* Simple floor to give spatial context */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
            <planeGeometry args={[3, 3, 1, 1]} />
            <meshStandardMaterial color={'#111'} />
          </mesh>
        </>
      )}
    </group>
  )
} 