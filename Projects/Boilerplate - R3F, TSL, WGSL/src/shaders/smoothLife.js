// shaders/smoothLife.js
import smoothLifeWGSL from './smoothLife.wgsl?raw'
import { wgslFn } from 'three/tsl'

export const smoothLifeComputeShader = wgslFn(smoothLifeWGSL)
