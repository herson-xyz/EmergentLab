import { useEffect, memo } from 'react'
import * as THREE from 'three/webgpu'
import useShaderVisualNodes from '../hooks/useShaderVisualNodes'

export default memo(function SmoothLifeRenderer({
  meshRef,
  readStateBuffer,
  instanceCount,
  width = 512,
  height = 512,
  spacing = 0.05
}) {
  const { fadedColorNode, opacityFadeNode } = useShaderVisualNodes(readStateBuffer, instanceCount)

  // Grid positioning initialization
  useEffect(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current
    const dummy = new THREE.Object3D()
    const offsetX = (width - 1) * spacing * 0.5
    const offsetY = (height - 1) * spacing * 0.5

    for (let i = 0; i < instanceCount; i++) {
      const x = i % width
      const y = Math.floor(i / width)

      dummy.position.set(x * spacing - offsetX, y * spacing - offsetY, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [meshRef, instanceCount, width, height, spacing])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, instanceCount]}>
      <planeGeometry args={[0.04, 0.04]} />
      <meshBasicNodeMaterial
        colorNode={fadedColorNode}
        opacityNode={opacityFadeNode}
        transparent
        depthWrite={false}
      />
    </instancedMesh>
  )
})
