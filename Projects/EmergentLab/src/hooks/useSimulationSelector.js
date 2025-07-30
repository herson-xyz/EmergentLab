import { useControls } from 'leva'

export function useSimulationSelector() {
  return useControls('Simulation', {
    simulationType: {
      label: 'Type',
      options: {
        'Game of Life': 'gameOfLife'
      },
      value: 'gameOfLife'
    }
  })
} 