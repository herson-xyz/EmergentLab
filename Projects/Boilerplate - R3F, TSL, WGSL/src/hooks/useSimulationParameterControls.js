import { useControls } from 'leva'

export function useSimulationParameterControls(simulationType) {
  const params = useControls('Shader Params', {
    // SmoothLife parameters
    innerRadius: { value: 1.0, min: 0.0, max: 5.0, step: 0.01, render: () => simulationType === 'smooth' },
    outerRadius: { value: 3.0, min: 0.0, max: 10.0, step: 0.01, render: () => simulationType === 'smooth' },
    B1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001, render: () => simulationType === 'smooth' },
    B2: { value: 0.365, min: 0.0, max: 1.0, step: 0.001, render: () => simulationType === 'smooth' },
    D1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001, render: () => simulationType === 'smooth' },
    D2: { value: 0.445, min: 0.0, max: 1.0, step: 0.001, render: () => simulationType === 'smooth' },
    M:  { value: 2.0,   min: 0.0, max: 10.0, step: 0.01, render: () => simulationType === 'smooth' },
    alpha: { value: 0.03, min: 0.0, max: 1.0, step: 0.001, render: () => simulationType === 'smooth' },
    beta:  { value: 0.07, min: 0.0, max: 1.0, step: 0.001, render: () => simulationType === 'smooth' },
    
    // Lenia parameters
    R: { value: 13.0, min: 1.0, max: 30.0, step: 0.5, render: () => simulationType === 'lenia' },
    T: { value: 10.0, min: 1.0, max: 50.0, step: 0.1, render: () => simulationType === 'lenia' },
    leniaM: { value: 0.15, min: 0.0, max: 1.0, step: 0.001, render: () => simulationType === 'lenia' },
    S: { value: 0.015, min: 0.001, max: 0.1, step: 0.001, render: () => simulationType === 'lenia' },
  })

  return params
}
