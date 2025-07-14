// shaders/lenia.js
import leniaWGSL from './lenia.wgsl?raw'
import { wgslFn } from 'three/tsl'

export const leniaComputeShader = wgslFn(leniaWGSL)
