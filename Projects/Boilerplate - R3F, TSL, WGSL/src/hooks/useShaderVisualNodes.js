import { useMemo } from 'react'
import { storage, instanceIndex, vec3 } from 'three/tsl'

export default function useShaderVisualNodes(readStateBuffer, COUNT) {
  return useMemo(() => {
    if (!readStateBuffer) {
      return {
        fadedColorNode: vec3(1, 1, 1),
        opacityFadeNode: vec3(1)
      }
    }

    const stateElement = storage(readStateBuffer, 'float', COUNT).element(instanceIndex)
    const threshold = 0.05
    const fadeWidth = 0.05
    const fadeFactor = stateElement.smoothstep(threshold, threshold + fadeWidth)

    const fadedColorNode = vec3(1, 1, 1).sub(vec3(1, 1, 1).mul(fadeFactor))
    const opacityFadeNode = fadeFactor

    return { fadedColorNode, opacityFadeNode }
  }, [readStateBuffer])
}
