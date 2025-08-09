import React, { useRef, useState, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import FullscreenPostProcessing from './FullscreenPostProcessing'
import MinimizedPostProcessing from './MinimizedPostProcessing'
import FullscreenRenderTargetManager from './FullscreenRenderTargetManager'
import MinimizedRenderTargetManager from './MinimizedRenderTargetManager'
import WebGPUCellularAutomata from './WebGPUCellularAutomata'
import { USE_OFFSCREEN_SIM } from '../config/featureFlags'
import SimulationOffscreen from './SimulationOffscreen'
import ArcadeScene from './ArcadeScene'

export default function MainScene() {
  const { camera } = useThree();
  const fullscreenRenderTargetRef = useRef();
  const minimizedRenderTargetRef = useRef();
  const [fullscreenTexture, setFullscreenTexture] = useState();
  const [minimizedTexture, setMinimizedTexture] = useState();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Offscreen sim refs
  const simSceneRef = useRef(null)
  const simCamMiniRef = useRef(null)
  const simCamFullRef = useRef(null)
  
  useEffect(() => {
    console.log('Offscreen simulation feature is', USE_OFFSCREEN_SIM ? 'ENABLED' : 'DISABLED');
  }, []);
  
  // Keyboard event listener for Cmd+F (or Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);
  
  return (
    <>
      {/* OrbitControls only in fullscreen mode */}
      {isFullscreen && (
        <OrbitControls 
          camera={camera}
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
        />
      )}
      
      <ambientLight intensity={2} />

      {/* Phase 1: conditionally mount offscreen sim without affecting visuals */}
      {USE_OFFSCREEN_SIM && (
        <SimulationOffscreen 
          simSceneRef={simSceneRef}
          simCamMiniRef={simCamMiniRef}
          simCamFullRef={simCamFullRef}
        />
      )}

      {/* On-screen sim is disabled when offscreen feature is enabled */}
      {!USE_OFFSCREEN_SIM && <WebGPUCellularAutomata />}

      {/* Arcade Scene (minimized presentation) shown only when flag is enabled */}
      {!isFullscreen && USE_OFFSCREEN_SIM && (
        <ArcadeScene
          enabled={true}
          texture={minimizedTexture}
        />
      )}
      
      {/* Fullscreen render path */}
      <FullscreenRenderTargetManager 
        renderTargetRef={fullscreenRenderTargetRef}
        setTexture={setFullscreenTexture}
        isFullscreen={isFullscreen}
        // Offscreen scene/camera passed only when feature enabled
        offscreenScene={USE_OFFSCREEN_SIM ? simSceneRef : undefined}
        offscreenCamera={USE_OFFSCREEN_SIM ? simCamFullRef : undefined}
      />
      
      {/* Minimized render path */}
      <MinimizedRenderTargetManager 
        renderTargetRef={minimizedRenderTargetRef}
        setTexture={setMinimizedTexture}
        isFullscreen={isFullscreen}
        // Offscreen scene/camera passed only when feature enabled
        offscreenScene={USE_OFFSCREEN_SIM ? simSceneRef : undefined}
        offscreenCamera={USE_OFFSCREEN_SIM ? simCamMiniRef : undefined}
      />
      
      {/* Fullscreen PostProcessing */}
      {isFullscreen && fullscreenTexture && <FullscreenPostProcessing texture={fullscreenTexture} />}
      
      {/* Minimized PostProcessing (temporary, will be removed once arcade screen is primary) */}
      {!isFullscreen && !USE_OFFSCREEN_SIM && minimizedTexture && <MinimizedPostProcessing texture={minimizedTexture} />}
    </>
  );
} 