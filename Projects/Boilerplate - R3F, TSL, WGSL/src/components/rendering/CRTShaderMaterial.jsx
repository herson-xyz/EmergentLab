import { useMemo } from 'react'
import { 
  texture, 
  vec2, 
  vec3, 
  float, 
  uniform, 
  uv, 
  mul, 
  add, 
  sin, 
  fract,
  mix,
  color
} from 'three/tsl'

export default function CRTShaderMaterial({ inputTexture, scanlineIntensity = 0.1, scanlineCount = 240 }) {
  const material = useMemo(() => {
    // Create uniforms for CRT parameters
    const scanlineIntensityUniform = uniform(scanlineIntensity)
    const scanlineCountUniform = uniform(scanlineCount)
    const timeUniform = uniform(0)

    // Get UV coordinates
    const uvCoords = uv()

    // Sample the input texture
    const inputColor = texture(inputTexture, uvCoords)

    // Create scanline effect
    const scanlineY = mul(uvCoords.y, scanlineCountUniform)
    const scanline = sin(mul(scanlineY, 3.14159)) // sin(π * y * scanlineCount)
    const scanlineEffect = add(1.0, mul(scanline, scanlineIntensityUniform))

    // Apply scanline effect to the color
    const crtColor = mul(inputColor, scanlineEffect)

    return {
      fragmentNode: crtColor,
      uniforms: {
        scanlineIntensity: scanlineIntensityUniform,
        scanlineCount: scanlineCountUniform,
        time: timeUniform
      }
    }
  }, [inputTexture, scanlineIntensity, scanlineCount])

  return (
    <meshBasicNodeMaterial
      fragmentNode={material.fragmentNode}
      toneMapped={false}
      transparent={true}
    />
  )
} 