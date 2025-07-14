import smoothLifeWGSL from './shaders/smoothLife.wgsl?raw'
import leniaWGSL from './shaders/lenia.wgsl?raw'
import { wgslFn } from 'three/tsl'

export const simulationRegistry = {
  SmoothLife: {
    name: 'SmoothLife',
    computeShader: () => wgslFn(smoothLifeWGSL),
    description: 'Continuous version of Conway’s Game of Life',
  },
  Lenia: {
    name: 'Lenia',
    computeShader: () => wgslFn(leniaWGSL),
    description: 'Smooth cellular automaton with differentiable update rules',
  },
}
