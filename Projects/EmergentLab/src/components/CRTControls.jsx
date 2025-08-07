import { useControls } from 'leva'

export default function CRTControls() {
  // Add Leva controls for CRT parameters
  const crtParams = useControls('CRT Effects', {
    enabled: { value: true, label: 'Enable CRT' },
    curvature: { value: 0.3, min: 0, max: 1, step: 0.1, label: 'Screen Curvature' },
    scanlines: { value: 1.0, min: 0, max: 1, step: 0.1, label: 'Scanlines' },
    vignette: { value: 0.5, min: 0, max: 1, step: 0.1, label: 'Vignette' },
    cyanTint: { value: 0.15, min: 0, max: 0.5, step: 0.05, label: 'Cyan Tint' },
    colorBleeding: { value: 0.02, min: 0, max: 0.05, step: 0.001, label: 'Color Bleeding' },
    bleedingIntensity: { value: 0.8, min: 0, max: 1, step: 0.1, label: 'Bleeding Intensity' },
    bloomIntensity: { value: 1.5, min: 0, max: 2, step: 0.1, label: 'Bloom Intensity' },
    bloomThreshold: { value: 0, min: 0, max: 1, step: 0.05, label: 'Bloom Threshold' },
    bloomRadius: { value: 2.5, min: 1, max: 10, step: 0.5, label: 'Bloom Radius' },
    brightness: { value: 1.4, min: 0.5, max: 2.0, step: 0.1, label: 'Brightness' },
    gamma: { value: 1.0, min: 0.5, max: 1.5, step: 0.1, label: 'Gamma' }
  })

  return null // This component only provides controls, no rendering
} 