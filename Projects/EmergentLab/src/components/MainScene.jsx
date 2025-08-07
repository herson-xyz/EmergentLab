import React, { useRef, useState, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import FullscreenPostProcessing from './FullscreenPostProcessing'
import MinimizedPostProcessing from './MinimizedPostProcessing'
import FullscreenRenderTargetManager from './FullscreenRenderTargetManager'
import MinimizedRenderTargetManager from './MinimizedRenderTargetManager'
import WebGPUCellularAutomata from './WebGPUCellularAutomata'

export default function MainScene() {
  const { camera } = useThree();
  const fullscreenRenderTargetRef = useRef();
  const minimizedRenderTargetRef = useRef();
  const [fullscreenTexture, setFullscreenTexture] = useState();
  const [minimizedTexture, setMinimizedTexture] = useState();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Keyboard event listener for Cmd+F (or Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        setIsFullscreen(prev => !prev);
        console.log('Toggled to:', !isFullscreen ? 'fullscreen' : 'minimized');
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
      <WebGPUCellularAutomata />
      
      {/* Fullscreen render path */}
      <FullscreenRenderTargetManager 
        renderTargetRef={fullscreenRenderTargetRef}
        setTexture={setFullscreenTexture}
        isFullscreen={isFullscreen}
      />
      
      {/* Minimized render path */}
      <MinimizedRenderTargetManager 
        renderTargetRef={minimizedRenderTargetRef}
        setTexture={setMinimizedTexture}
        isFullscreen={isFullscreen}
      />
      
      {/* Fullscreen PostProcessing */}
      {isFullscreen && fullscreenTexture && <FullscreenPostProcessing texture={fullscreenTexture} />}
      
      {/* Minimized PostProcessing */}
      {!isFullscreen && minimizedTexture && <MinimizedPostProcessing texture={minimizedTexture} />}
    </>
  );
} 