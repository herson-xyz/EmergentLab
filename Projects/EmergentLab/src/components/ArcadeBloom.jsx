import { useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import * as THREE from 'three'

export default function ArcadeBloom({ enabled = true, strength = 1.0, radius = 0.8, threshold = 0.8 }) {
  const { gl, scene, camera, size } = useThree()

  const composer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, {
      samples: 0,
    })
    const comp = new EffectComposer(gl, target)
    comp.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), strength, radius, threshold)
    comp.addPass(bloom)
    return comp
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl])

  useEffect(() => {
    composer.setSize(size.width, size.height)
  }, [composer, size])

  useEffect(() => {
    // Update bloom params on change
    const bloom = composer.passes.find((p) => p instanceof UnrealBloomPass)
    if (bloom) {
      bloom.strength = strength
      bloom.radius = radius
      bloom.threshold = threshold
    }
  }, [composer, strength, radius, threshold])

  useFrame(() => {
    if (!enabled) return
    composer.render()
  }, 1)

  useEffect(() => {
    return () => {
      composer.dispose()
    }
  }, [composer])

  return null
} 