// useSimulationSelector.js
import { useControls } from 'leva'
import { simulationRegistry } from '../simulationRegistry'

export function useSimulationSelector() {
  const { simulation } = useControls('Simulation', {
    simulation: {
      options: Object.keys(simulationRegistry),
      value: 'SmoothLife'
    }
  })

  const selected = simulationRegistry[simulation]

  return {
    simulationKey: simulation,
    ...selected
  }
}
