import React, { useRef, useState, useEffect } from 'react'
import SimulationOrchestrator from '../simulation/SimulationOrchestrator'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { RefractionMesh, OffscreenRenderTargetManager, OffscreenDisplayAsQuad, CRTTestQuad } from '../rendering'

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
      {/* OrbitControls only in fullscreen mode */}
      {isFullscreen && (
        <OrbitControls 
          camera={camera}
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
        />
      )}
      
      {/* <RefractionMesh /> */}
      <ambientLight intensity={2} />
      <SimulationOrchestrator />
      <OffscreenRenderTargetManager renderTargetRef={renderTargetRef} setTexture={setTexture} isFullscreen={isFullscreen} />
      {!isFullscreen && <OffscreenDisplayAsQuad texture={texture} />}
      
      {/* Temporary test - remove after testing */}
      <CRTTestQuad />
    </>
  );
} 