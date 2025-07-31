import { useControls, folder } from 'leva'

export default function SimulationParameters() {
  const params = useControls({
    'Simulation': folder({
      'SmoothLife v1': folder({
        innerRadius: { value: 1.0, min: 0.0, max: 10.0, step: 0.1 },
        outerRadius: { value: 3.0, min: 0.0, max: 20.0, step: 0.1 },
        b1: { value: 0.257, min: 0.0, max: 1.0, step: 0.001 },
        b2: { value: 0.336, min: 0.0, max: 1.0, step: 0.001 },
        d1: { value: 0.365, min: 0.0, max: 1.0, step: 0.001 },
        d2: { value: 0.549, min: 0.0, max: 1.0, step: 0.001 },
        dt: { value: 0.1, min: 0.01, max: 1.0, step: 0.01 },
        steepness: { value: 0.001, min: 0.0001, max: 0.01, step: 0.0001 }
      }, { collapsed: false }) // 👈 expanded by default for easy access
    })
  })
  
  return params
} 