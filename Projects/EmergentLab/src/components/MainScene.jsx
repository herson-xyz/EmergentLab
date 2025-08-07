import React, { useRef, useState, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import PostProcessing from './PostProcessing'
import OffscreenRenderTargetManager from './OffscreenRenderTargetManager'
import OffscreenDisplayAsQuad from './OffscreenDisplayAsQuad'
import WebGPUCellularAutomata from './WebGPUCellularAutomata'
import CRTControls from './CRTControls'

export default function MainScene() {
  const { camera } = useThree();
  const renderTargetRef = useRef();
  const [texture, setTexture] = useState();
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
      {/* CRT Controls - always visible */}
      <CRTControls />
      
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
      <OffscreenRenderTargetManager renderTargetRef={renderTargetRef} setTexture={setTexture} isFullscreen={isFullscreen} />
      {!isFullscreen && texture && <PostProcessing minimizedTexture={texture} />}
    </>
  );
} 