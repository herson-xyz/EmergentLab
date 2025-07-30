import { useControls, button } from 'leva'

export default function SimulationControls({ onPlay, onPause, onReset }) {
  useControls({
    'Play Simulation': button(onPlay),
    'Pause Simulation': button(onPause),
    'Reset Simulation': button(() => {
      onReset?.()
      onPlay?.() // optional: resume on reset
    })
  })

  return null // Leva renders the controls automatically
} 