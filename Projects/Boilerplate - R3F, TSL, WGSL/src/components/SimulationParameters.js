import { useControls } from 'leva'

export default function SimulationParameters() {
  // Leva GUI controls for shader parameters
  const params = useControls({
    // SmoothLife parameters
    innerRadius: { value: 1.0, min: 0.0, max: 5.0, step: 0.01 },
    outerRadius: { value: 3.0, min: 0.0, max: 10.0, step: 0.01 },
    B1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001 },
    B2: { value: 0.365, min: 0.0, max: 1.0, step: 0.001 },
    D1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001 },
    D2: { value: 0.445, min: 0.0, max: 1.0, step: 0.001 },
    M:  { value: 2.0,   min: 0.0, max: 10.0, step: 0.01 },
    alpha: { value: 0.03, min: 0.0, max: 1.0, step: 0.001 },
    beta:  { value: 0.07, min: 0.0, max: 1.0, step: 0.001 },
    // Lenia parameters
    R: { value: 13.0, min: 1.0, max: 30.0, step: 0.5 },
    T: { value: 10.0, min: 1.0, max: 50.0, step: 0.1 },
    leniaM: { value: 0.15, min: 0.0, max: 1.0, step: 0.001 },
    S: { value: 0.015, min: 0.001, max: 0.1, step: 0.001 },
  })

  return params
} 