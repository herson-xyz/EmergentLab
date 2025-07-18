import { useControls, folder } from 'leva'

export default function SimulationParameters(simulationType) {
  const params = useControls({
    'SmoothLife v1': folder({
      innerRadius: { value: 1, min: 0, max: 5, step: 1 },
      outerRadius: { value: 3, min: 0, max: 10, step: 1 },
      B1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001},
      B2: { value: 0.365, min: 0.0, max: 1.0, step: 0.001},
      D1: { value: 0.278, min: 0.0, max: 1.0, step: 0.001},
      D2: { value: 0.445, min: 0.0, max: 1.0, step: 0.001},
      M: { value: 2.0, min: 0.0, max: 10.0, step: 0.01 },
      alpha: { value: 0.03, min: 0.0, max: 1.0, step: 0.001},
      beta: { value: 0.07, min: 0.0, max: 1.0, step: 0.001},
    }, { collapsed: true }), // 👈 collapsed by default

    'SmoothLife v2': folder({
      innerRadiusV2: { value: 3, min: 0, max: 10, step: 1 },
      outerRadiusV2: { value: 10, min: 0, max: 20, step: 1 },
      B1V2: { value: 0.257, min: 0.0, max: 1.0, step: 0.001},
      B2V2: { value: 0.336, min: 0.0, max: 1.0, step: 0.001},
      D1V2: { value: 0.365, min: 0.0, max: 1.0, step: 0.001},
      D2V2: { value: 0.549, min: 0.0, max: 1.0, step: 0.001},
    }, { collapsed: true }), // 👈 collapsed by default

    Lenia: folder({
      R: { value: 13.0, min: 1.0, max: 30.0, step: 0.5 },
      T: { value: 10.0, min: 1.0, max: 50.0, step: 0.1 },
      leniaM: { value: 0.15, min: 0.0, max: 1.0, step: 0.001 },
      S: { value: 0.015, min: 0.001, max: 0.1, step: 0.001 },
    }, { collapsed: true }) // 👈 collapsed by default
  })

  return params
}
