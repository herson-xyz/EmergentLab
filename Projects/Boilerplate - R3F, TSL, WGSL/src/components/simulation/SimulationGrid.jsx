import { useEffect, memo, useMemo } from 'react'
import * as THREE from 'three/webgpu'
import { storage, instanceIndex, vec3 } from 'three/tsl'
import { dimensions } from '../../constants/dimensions'

export default memo(function SimulationGrid({
  meshRef,
  readStateBuffer,
  spacing = 0.05
}) {
  const { fadedColorNode, opacityFadeNode } = useMemo(() => {
    if (!readStateBuffer) {
      return {
        fadedColorNode: vec3(1, 1, 1),
        opacityFadeNode: vec3(1)
      }
    }

    const stateElement = storage(readStateBuffer, 'float', dimensions.COUNT).element(instanceIndex)
    const threshold = 0.05
    const fadeWidth = 0.05
    const fadeFactor = stateElement.smoothstep(threshold, threshold + fadeWidth)

    const fadedColorNode = vec3(0, 1, 1)
    const opacityFadeNode =  fadeFactor

    return { fadedColorNode, opacityFadeNode }
  }, [readStateBuffer])

  // Grid positioning initialization
  useEffect(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current
    const dummy = new THREE.Object3D()
    const offsetX = (dimensions.WIDTH - 1) * spacing * 0.5
    const offsetY = (dimensions.HEIGHT - 1) * spacing * 0.5

    for (let i = 0; i < dimensions.COUNT; i++) {
      const x = i % dimensions.WIDTH
      const y = Math.floor(i / dimensions.WIDTH)

      dummy.position.set(x * spacing - offsetX, y * spacing - offsetY, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [meshRef, dimensions.COUNT, dimensions.WIDTH, dimensions.HEIGHT, spacing])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, dimensions.COUNT]}>
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
