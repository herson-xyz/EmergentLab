export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: [800, 600] },
    curvature: { value: 8.0 },
    scanlines: { value: 0.8 },
    vignette: { value: 0.5 },
    cyanTint: { value: 0.15 },
    colorBleeding: { value: 0.02 },
    bleedingIntensity: { value: 0.8 },
    bloomIntensity: { value: 0.8 },
    bloomThreshold: { value: 0.6 },
    bloomRadius: { value: 4.0 },
    brightness: { value: 1.2 },
    gamma: { value: 1.0 }
  },

  vertexShader: `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
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
    
    // Bloom sampling function
    vec3 sampleBloom(vec2 uv, vec2 offset) {
      return texture2D(tDiffuse, uv + offset).rgb;
    }
    
    void main() {
      // Apply screen curvature
      vec2 uv = vUv - 0.5;
      uv *= 1.0 + uv.yx * uv.yx * curvature;
      uv += 0.5;
      
      // Discard pixels outside the curved screen
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      
      // Sample the original texture with color bleeding
      vec4 color = texture2D(tDiffuse, uv);
      
      // Apply color bleeding (RGB channel separation)
      float bleeding = colorBleeding * bleedingIntensity;
      
      // Sample red channel (slightly offset to the right)
      vec4 redChannel = texture2D(tDiffuse, uv + vec2(bleeding, 0.0));
      
      // Sample green channel (slightly offset down)
      vec4 greenChannel = texture2D(tDiffuse, uv + vec2(0.0, bleeding));
      
      // Sample blue channel (slightly offset to the left)
      vec4 blueChannel = texture2D(tDiffuse, uv + vec2(-bleeding, 0.0));
      
      // Combine channels with bleeding effect
      vec3 bleedingColor = vec3(
        redChannel.r,
        greenChannel.g,
        blueChannel.b
      );
      
      // Mix original color with bleeding color based on brightness
      float brightness_old = (color.r + color.g + color.b) / 3.0;
      float bleedingMix = brightness_old * bleedingIntensity;
      color.rgb = mix(color.rgb, bleedingColor, bleedingMix);
      
      // Apply bloom effect
      vec3 bloom = vec3(0.0);
      float totalWeight = 0.0;
      
      // Sample in a circular pattern around the current pixel
      for (float angle = 0.0; angle < 6.28318; angle += 0.785398) { // 8 samples
        for (float radius = 1.0; radius <= bloomRadius; radius += 1.0) {
          vec2 offset = vec2(cos(angle), sin(angle)) * radius / resolution;
          vec3 bloomSample = sampleBloom(uv, offset);
          
          // Only bloom bright areas
          float sampleBrightness = (bloomSample.r + bloomSample.g + bloomSample.b) / 3.0;
          if (sampleBrightness > bloomThreshold) {
            float weight = 1.0 / radius; // Fade with distance
            bloom += bloomSample * weight;
            totalWeight += weight;
          }
        }
      }
      
      // Normalize and apply bloom
      if (totalWeight > 0.0) {
        bloom /= totalWeight;
        color.rgb += bloom * bloomIntensity;
      }
      
      // Add scanlines (more obvious)
      float scanline = sin(uv.y * resolution.y * 2.0) * 0.5 + 0.5;
      scanline = 1.0 - (1.0 - scanline) * scanlines;
      color.rgb *= scanline;
      
      // Add vignette (more obvious)
      float vignetteEffect = 1.0 - length(uv - 0.5) * vignette;
      color.rgb *= vignetteEffect;
      
      // Apply brightness and gamma correction
      color.rgb = pow(color.rgb * brightness, vec3(1.0 / gamma));
      
      // Add cyan tint (adjustable)
      color.rgb += vec3(0.0, cyanTint, cyanTint);
      
      gl_FragColor = color;
    }
  `
} 