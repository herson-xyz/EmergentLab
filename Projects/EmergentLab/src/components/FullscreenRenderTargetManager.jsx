import { useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function FullscreenRenderTargetManager({ renderTargetRef, setTexture, isFullscreen }) {
  const { scene, camera, gl, size } = useThree();

  // Create dynamic render target that matches window size
  const renderTarget = useMemo(() => {
    console.log('Creating fullscreen render target:', size.width, 'x', size.height);
    return new THREE.WebGLRenderTarget(size.width, size.height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });
  }, [size.width, size.height]);

  useEffect(() => {
    // Clean up previous render target if it exists
    if (renderTargetRef.current) {
      renderTargetRef.current.dispose();
    }
    
    renderTargetRef.current = renderTarget;
    if (setTexture) setTexture(renderTarget.texture);
    
    console.log('FullscreenRenderTargetManager: Render target created');
    
    // Clean up on unmount
    return () => {
      if (renderTargetRef.current) {
        renderTargetRef.current.dispose();
      }
    };
  }, [renderTarget, renderTargetRef, setTexture]);

  // Handle texture cleanup when switching modes
  useEffect(() => {
    if (!isFullscreen && setTexture) {
      setTexture(null);
      console.log('FullscreenRenderTargetManager: Cleaned up texture for minimized mode');
    } else if (isFullscreen && renderTargetRef.current && setTexture) {
      setTexture(renderTargetRef.current.texture);
      console.log('FullscreenRenderTargetManager: Restored texture for fullscreen mode');
    }
  }, [isFullscreen, setTexture, renderTargetRef]);

  useFrame(() => {
    // Only render to target when in fullscreen mode
    if (!isFullscreen || !renderTargetRef.current) {
      return;
    }
    
    console.log('FullscreenRenderTargetManager: Rendering to fullscreen target');
    
    // Use main camera (respects user controls)
    gl.setRenderTarget(renderTargetRef.current);
    gl.setClearColor(0x000000);
    gl.clear();
    gl.render(scene, camera); // Main camera with OrbitControls
    gl.setRenderTarget(null);
    gl.setClearColor(0x000000);
  });

  return null;
} 