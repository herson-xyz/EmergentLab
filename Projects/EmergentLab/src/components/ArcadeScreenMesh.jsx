import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useControls } from 'leva'

export default function ArcadeScreenMesh({ texture }) {
  // If no texture is provided, render nothing
  if (!texture) return null

  // CRT params for object-space usage on the screen mesh
  const crt = useControls('CRT Effects (Arcade Screen)', {
    curvature: { value: 0.1, min: 0, max: 1, step: 0.01 },
    scanlines: { value: 1.0, min: 0, max: 1, step: 0.05 },
    vignette: { value: 0.6, min: 0, max: 1, step: 0.05 },
    cyanTint: { value: 0.12, min: 0, max: 0.5, step: 0.01 },
    colorBleeding: { value: 0.02, min: 0, max: 0.05, step: 0.001 },
    bleedingIntensity: { value: 0.8, min: 0, max: 1, step: 0.05 },
    bloomIntensity: { value: 1.2, min: 0, max: 2, step: 0.1 },
    bloomThreshold: { value: 0.0, min: 0, max: 1, step: 0.05 },
    bloomRadius: { value: 2.0, min: 1, max: 10, step: 0.5 },
    brightness: { value: 1.2, min: 0.5, max: 2.0, step: 0.05 },
    gamma: { value: 1.0, min: 0.5, max: 1.5, step: 0.05 },
  })

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(512, 512) },
      curvature: { value: crt.curvature },
      scanlines: { value: crt.scanlines },
      vignette: { value: crt.vignette },
      cyanTint: { value: crt.cyanTint },
      colorBleeding: { value: crt.colorBleeding },
      bleedingIntensity: { value: crt.bleedingIntensity },
      bloomIntensity: { value: crt.bloomIntensity },
      bloomThreshold: { value: crt.bloomThreshold },
      bloomRadius: { value: crt.bloomRadius },
      brightness: { value: crt.brightness },
      gamma: { value: crt.gamma },
    },
    vertexShader: `
      varying vec2 vUv;
      uniform float curvature;
      
      void main() {
        vUv = uv;
        vec3 pos = position;
        vec2 uv_centered = uv - 0.5;
        float curve = curvature * 0.1; // standard curvature for arcade screen
        float dist = length(uv_centered);
        float factor = 1.0 - dist * dist * curve;
        pos.xy *= factor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float curvature;
      uniform float scanlines;
      uniform float vignette;
      uniform float cyanTint;
      uniform float colorBleeding;
      uniform float bleedingIntensity;
      uniform float bloomIntensity;
      uniform float bloomThreshold;
      uniform float bloomRadius;
      uniform float brightness;
      uniform float gamma;
      
      varying vec2 vUv;
      
      vec3 sampleBloom(vec2 uv, vec2 offset) {
        return texture2D(tDiffuse, uv + offset).rgb;
      }
      
      void main() {
        vec2 uv = vUv;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }
        
        vec4 color = texture2D(tDiffuse, uv);
        float bleeding = colorBleeding * bleedingIntensity;
        vec4 redChannel = texture2D(tDiffuse, uv + vec2(bleeding, 0.0));
        vec4 greenChannel = texture2D(tDiffuse, uv + vec2(0.0, bleeding));
        vec4 blueChannel = texture2D(tDiffuse, uv + vec2(-bleeding, 0.0));
        vec3 bleedingColor = vec3(redChannel.r, greenChannel.g, blueChannel.b);
        float brightness_old = (color.r + color.g + color.b) / 3.0;
        float bleedingMix = brightness_old * bleedingIntensity;
        color.rgb = mix(color.rgb, bleedingColor, bleedingMix);
        
        // Bloom
        vec3 bloom = vec3(0.0);
        float totalWeight = 0.0;
        for (float angle = 0.0; angle < 6.28318; angle += 0.785398) {
          for (float radius = 1.0; radius <= bloomRadius; radius += 1.0) {
            vec2 offset = vec2(cos(angle), sin(angle)) * radius / resolution;
            vec3 bloomSample = sampleBloom(uv, offset);
            float sampleBrightness = (bloomSample.r + bloomSample.g + bloomSample.b) / 3.0;
            if (sampleBrightness > bloomThreshold) {
              float weight = 1.0 / radius;
              bloom += bloomSample * weight;
              totalWeight += weight;
            }
          }
        }
        if (totalWeight > 0.0) {
          bloom /= totalWeight;
          color.rgb += bloom * bloomIntensity;
        }
        
        // Scanlines
        float scanline = sin(uv.y * resolution.y * 2.0) * 0.5 + 0.5;
        scanline = 1.0 - (1.0 - scanline) * scanlines;
        color.rgb *= scanline;
        
        // Vignette
        float vignetteEffect = 1.0 - length(uv - 0.5) * vignette;
        color.rgb *= vignetteEffect;
        
        // Tone
        color.rgb = pow(color.rgb * brightness, vec3(1.0 / gamma));
        color.rgb += vec3(0.0, cyanTint, cyanTint);
        
        gl_FragColor = color;
      }
    `,
    transparent: false,
  }), [crt])

  // Keep uniforms updated when controls change
  material.uniforms.curvature.value = crt.curvature
  material.uniforms.scanlines.value = crt.scanlines
  material.uniforms.vignette.value = crt.vignette
  material.uniforms.cyanTint.value = crt.cyanTint
  material.uniforms.colorBleeding.value = crt.colorBleeding
  material.uniforms.bleedingIntensity.value = crt.bleedingIntensity
  material.uniforms.bloomIntensity.value = crt.bloomIntensity
  material.uniforms.bloomThreshold.value = crt.bloomThreshold
  material.uniforms.bloomRadius.value = crt.bloomRadius
  material.uniforms.brightness.value = crt.brightness
  material.uniforms.gamma.value = crt.gamma
  material.uniforms.tDiffuse.value = texture

  return (
    <mesh>
      <planeGeometry args={[1, 1, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
} 