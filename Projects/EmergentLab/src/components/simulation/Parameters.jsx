import { useControls, folder } from 'leva'

export default function SimulationParameters() {
  const params = useControls({
    'Simulation': folder({
      initialState: {
        label: 'Initial State',
        options: {
          'Random': 'random',
          'Central Blob': 'centralBlob',
          'Multiple Blobs': 'multipleBlobs',
          'Glider': 'glider',
          'Still Life': 'stillLife',
          'Oscillator': 'oscillator',
          'Empty': 'empty',
          'Full': 'full',
          'Checkerboard': 'checkerboard',
          'Cross': 'cross'
        },
        value: 'random'
      },
      'SmoothLife v1': folder({
        innerRadius: { value: 3.0, min: 0.0, max: 10.0, step: 0.1 },
        outerRadius: { value: 12.0, min: 0.0, max: 20.0, step: 0.1 },
        b1: { value: 0.23, min: 0.0, max: 1.0, step: 0.001 },
        b2: { value: 0.26, min: 0.0, max: 1.0, step: 0.001 },
        d1: { value: 0.26, min: 0.0, max: 1.0, step: 0.001 },
        d2: { value: 0.47, min: 0.0, max: 1.0, step: 0.001 },
        dt: { value: 0.03, min: 0.01, max: 1.0, step: 0.01 },
        steepness: { value: 0.001, min: 0.0001, max: 0.01, step: 0.0001 }
      }, { collapsed: false }) // 👈 expanded by default for easy access
    })
  })
  
  return params
} 