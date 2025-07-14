import { useControls } from 'leva'

export function useSimulationSelector() {
  return useControls('Simulation', {
    simulationType: {
      label: 'Shader',
      options: {
        SmoothLife: 'smooth',
        Lenia: 'lenia'
      },
      value: 'smooth'
    }
  })
}