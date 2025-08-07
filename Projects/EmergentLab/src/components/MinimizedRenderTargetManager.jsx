import { useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function MinimizedRenderTargetManager({ renderTargetRef, setTexture, isFullscreen }) {
  const { scene, gl } = useThree();
  
  // Fixed camera for minimized mode (square aspect ratio)
  const fixedCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(15, 1, 0.1, 1000); // aspect = 1 for square
    cam.position.set(0, 0, 2);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    console.log('MinimizedRenderTargetManager: Fixed camera created');
    return cam;
  }, []);

  // Fixed 512x512 render target
  const renderTarget = useMemo(() => {
    console.log('Creating minimized render target: 512 x 512');
    return new THREE.WebGLRenderTarget(512, 512, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });
  }, []);

  useEffect(() => {
    // Clean up previous render target if it exists
    if (renderTargetRef.current) {
      renderTargetRef.current.dispose();
    }
    
    renderTargetRef.current = renderTarget;
    if (setTexture) setTexture(renderTarget.texture);
    
    console.log('MinimizedRenderTargetManager: Render target created');
    
    // Clean up on unmount
    return () => {
      if (renderTargetRef.current) {
        renderTargetRef.current.dispose();
      }
    };
  }, [renderTarget, renderTargetRef, setTexture]);

  // Handle texture cleanup when switching modes
  useEffect(() => {
    if (isFullscreen && setTexture) {
      setTexture(null);
      console.log('MinimizedRenderTargetManager: Cleaned up texture for fullscreen mode');
    } else if (!isFullscreen && renderTargetRef.current && setTexture) {
      setTexture(renderTargetRef.current.texture);
      console.log('MinimizedRenderTargetManager: Restored texture for minimized mode');
    }
  }, [isFullscreen, setTexture, renderTargetRef]);

  useFrame(() => {
    // Only render to target when in minimized mode
    if (isFullscreen || !renderTargetRef.current) {
      return;
    }
    
    console.log('MinimizedRenderTargetManager: Rendering to minimized target');
    
    // Use fixed camera for consistent display
    gl.setRenderTarget(renderTargetRef.current);
    gl.setClearColor(0x000000);
    gl.clear();
    gl.render(scene, fixedCamera); // Fixed camera
    gl.setRenderTarget(null);
    gl.setClearColor(0xffffff);
  });

  return null;
} 