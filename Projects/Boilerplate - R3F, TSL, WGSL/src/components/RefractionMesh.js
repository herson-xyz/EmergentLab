import { useRef } from 'react'
import { color, add, mul, vec3, float } from 'three/tsl'
import * as THREE from 'three/webgpu'

export default function RefractionMesh({ position = [0, 0, 7.75] }) {
  const meshRef = useRef()

  const cylinderRadius = 0.5
  const cylinderHeight = 0.1

  const glassColor = add(
    color('#ffffff'),
    mul(vec3(0.1, 0.1, 0.2), float(0.3))
  )

  return (
    <group position={position} rotation={[Math.PI * 0.5, 0, 0]}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[cylinderRadius, cylinderRadius, cylinderHeight, 140]} />
        <meshPhysicalNodeMaterial
          colorNode={glassColor}
          roughness={0.2}
          metalness={0.0}
          transparent
          transmission={1}
          thickness={0.4}
          dispersion={0.2}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  )
}
