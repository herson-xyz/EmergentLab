import { useControls } from 'leva'

export function useSimulationSelector() {
  return useControls('Simulation', {
    simulationType: {
      label: 'Shader',
      options: {
        'SmoothLife v1': 'smooth',
        'SmoothLife v2': 'smoothv2',
        Lenia: 'lenia'
      },
      value: 'smooth'
    }
  })
}