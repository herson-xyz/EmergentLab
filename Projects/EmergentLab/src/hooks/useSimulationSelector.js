import { useControls } from 'leva'

export function useSimulationSelector() {
  return useControls('Simulation', {
    simulationType: {
      label: 'Type',
      options: {
        'Game of Life': 'gameOfLife',
        'SmoothLife v0.5': 'smoothLifeV05',
        'SmoothLife v1': 'smoothLifeV1'
      },
      value: 'smoothLifeV1'
    }
  })
} 