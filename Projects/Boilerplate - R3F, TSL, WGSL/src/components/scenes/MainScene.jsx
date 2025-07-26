import React, { useRef, useState, useEffect } from 'react'
import SimulationOrchestrator from '../simulation/SimulationOrchestrator'
import { OrbitControls } from '@react-three/drei'
import { RefractionMesh, RenderTargetPass, FullscreenQuad } from '../rendering'

export default function MainScene() {
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
      <RenderTargetPass renderTargetRef={renderTargetRef} setTexture={setTexture} isFullscreen={isFullscreen} />
      <ambientLight intensity={2} />
      {/* <RefractionMesh /> */}
      <SimulationOrchestrator />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      {!isFullscreen && <FullscreenQuad texture={texture} />}
    </>
  );
} 