import { useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function MinimizedRenderTargetManager({ renderTargetRef, setTexture, isFullscreen, offscreenScene, offscreenCamera }) {
  const { scene, gl } = useThree();
  
  // Fixed camera for minimized mode (square aspect ratio) when no offscreen camera provided
  const fixedCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(15, 1, 0.1, 1000); // aspect = 1 for square
    cam.position.set(0, 0, 2);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    return cam;
  }, []);

  // Fixed 512x512 render target
  const renderTarget = useMemo(() => {
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
    } else if (!isFullscreen && renderTargetRef.current && setTexture) {
      setTexture(renderTargetRef.current.texture);
    }
  }, [isFullscreen, setTexture, renderTargetRef]);

  useFrame(() => {
    // Only render to target when in minimized mode
    if (isFullscreen || !renderTargetRef.current) {
      return;
    }
    
    // Choose scene and camera (prefer offscreen if provided)
    const srcScene = offscreenScene?.current || scene;
    const srcCamera = offscreenCamera?.current || fixedCamera;
    
    gl.setRenderTarget(renderTargetRef.current);
    gl.setClearColor(0x000000);
    gl.clear();
    gl.render(srcScene, srcCamera);
    gl.setRenderTarget(null);
    gl.setClearColor(0x000000);
  });

  return null;
} 