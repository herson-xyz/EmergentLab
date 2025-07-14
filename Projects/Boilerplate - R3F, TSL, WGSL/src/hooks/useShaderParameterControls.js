import { useControls } from 'leva'

export function useShaderParameterControls() {
  const params = useControls('Shader Params', {
    innerRadius: { value: 1.0, min: 0.0, max: 5.0, step: 0.01 },
    outerRadius: { value: 3.0, min: 0.0, max: 10.0, step: 0.01 },
    B1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001 },
    B2: { value: 0.365, min: 0.0, max: 1.0, step: 0.001 },
    D1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001 },
    D2: { value: 0.445, min: 0.0, max: 1.0, step: 0.001 },
    M:  { value: 2.0,   min: 0.0, max: 10.0, step: 0.01 },
    alpha: { value: 0.03, min: 0.0, max: 1.0, step: 0.001 },
    beta:  { value: 0.07, min: 0.0, max: 1.0, step: 0.001 },
  })

  return params
}
