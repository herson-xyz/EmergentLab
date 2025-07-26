import { useEffect, memo, useMemo } from 'react'
import * as THREE from 'three/webgpu'
import { storage, instanceIndex, vec3 } from 'three/tsl'
import { dimensions } from '../../constants/dimensions'

export default memo(function SimulationGrid({
  meshRef,
  readStateBuffer,
  threshold,
  fadeWidth,
  spacing = 0.05
}) {
  const { fadedColorNode, opacityFadeNode } = useMemo(() => {
    if (!readStateBuffer) {
      return {
        fadedColorNode: vec3(1, 1, 1),
        opacityFadeNode: vec3(1)
      }
    }

    // Extract the current state value for this specific grid cell instance
    // In continuous cellular automata, each cell contains a float value (typically 0.0 to 1.0)
    // representing the "activity" or "density" of that cell
    const stateElement = storage(readStateBuffer, 'float', dimensions.COUNT).element(instanceIndex)
    
    // THRESHOLD: Determines the minimum activity level required for a cell to be visible
    // - Lower threshold (e.g., 0.01): Shows more subtle, low-activity patterns and background noise
    // - Higher threshold (e.g., 0.5): Only shows strong, high-activity emergent structures
    // - In continuous CA, emergent forms often have activity levels in specific ranges:
    //   * Gliders and oscillators: typically 0.3-0.8
    //   * Still lifes: often 0.4-0.9
    //   * Background patterns: usually 0.0-0.2
    // - Current value: Controlled by Leva GUI - allows real-time adjustment of visualization
    //   This is useful for exploring different aspects of emergent structures
    const thresholdValue = threshold
    
    // FADE WIDTH: Controls the smoothness of the transition from invisible to visible
    // - Smaller fadeWidth (e.g., 0.01): Sharp, crisp boundaries around emergent forms
    // - Larger fadeWidth (e.g., 0.2): Soft, gradual transitions that reveal internal structure
    // - This is crucial for continuous CA because emergent forms often have:
    //   * Core regions with high activity (solid appearance)
    //   * Boundary regions with intermediate activity (gradient appearance)
    //   * Transition zones that reveal the form's internal dynamics
    // - Current value: Controlled by Leva GUI - allows real-time adjustment of visualization
    const fadeWidthValue = fadeWidth
    
    // smoothstep creates a smooth transition from 0 to 1 over the range [threshold, threshold + fadeWidth]
    // This means:
    // - Cells with activity < threshold: completely transparent (opacity = 0)
    // - Cells with activity > threshold + fadeWidth: fully opaque (opacity = 1)
    // - Cells in between: gradual opacity based on their activity level
    // - With fadeWidth = 0, this becomes a step function: only cells at exactly threshold are visible
    const fadeFactor = stateElement.smoothstep(thresholdValue, thresholdValue + fadeWidthValue)

    // Color for the visible cells (cyan in this case)
    // The color choice can help distinguish different types of emergent forms
    // - Cyan (0, 1, 1): Good contrast against dark backgrounds, commonly used for CA visualization
    // - You could extend this to use different colors for different activity ranges:
    //   * Red for high activity cores
    //   * Green for medium activity boundaries  
    //   * Blue for low activity transition zones
    const fadedColorNode = vec3(0, 1, 1)
    
    // Apply the fade factor to control opacity
    // This creates the visual effect where only cells above the threshold are visible
    // The opacity directly corresponds to the cell's activity level in the continuous CA
    const opacityFadeNode =  fadeFactor

    return { fadedColorNode, opacityFadeNode }
  }, [readStateBuffer, threshold, fadeWidth])

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
