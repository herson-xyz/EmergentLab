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
    bleedingIntensity: { value: 0.8 }
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
    
    varying vec2 vUv;
    
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
      float brightness = (color.r + color.g + color.b) / 3.0;
      float bleedingMix = brightness * bleedingIntensity;
      color.rgb = mix(color.rgb, bleedingColor, bleedingMix);
      
      // Add scanlines (more obvious)
      float scanline = sin(uv.y * resolution.y * 2.0) * 0.5 + 0.5;
      scanline = 1.0 - (1.0 - scanline) * scanlines;
      color.rgb *= scanline;
      
      // Add vignette (more obvious)
      float vignetteEffect = 1.0 - length(uv - 0.5) * vignette;
      color.rgb *= vignetteEffect;
      
      // Add cyan tint (adjustable)
      color.rgb += vec3(0.0, cyanTint, cyanTint);
      
      gl_FragColor = color;
    }
  `
} 