import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function OffscreenRenderTargetManager({ renderTargetRef, setTexture, isFullscreen }) {
  const { scene, camera, gl } = useThree();
  const renderTargetCameraRef = useRef();

  useEffect(() => {
    // Clean up previous render target if it exists
    if (renderTargetRef.current) {
      renderTargetRef.current.dispose();
    }
    // Create a fixed-size render target (512x512 to match your current setup)
    renderTargetRef.current = new THREE.WebGLRenderTarget(512, 512, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });
    console.log('Created fixed-size WebGLRenderTarget:', renderTargetRef.current);
    if (setTexture) setTexture(renderTargetRef.current.texture);
    
    // Create a perspective camera for the render target
    renderTargetCameraRef.current = new THREE.PerspectiveCamera(
      15, // fov - match your current camera
      1, // Fixed aspect ratio of 1 for square render target
      0.1, // near
      1000 // far
    );
    
    // Set fixed position for render target camera
    renderTargetCameraRef.current.position.set(0, 0, 2);
    renderTargetCameraRef.current.lookAt(0, 0, 0);
    renderTargetCameraRef.current.updateProjectionMatrix();
    
    // Clean up on unmount
    return () => {
      if (renderTargetRef.current) {
        renderTargetRef.current.dispose();
      }
    };
  }, [renderTargetRef, setTexture]);

  // Handle texture cleanup when switching modes
  useEffect(() => {
    if (isFullscreen && setTexture) {
      // Set texture to null when switching to fullscreen mode
      setTexture(null);
      console.log('Cleaned up texture for fullscreen mode');
    } else if (!isFullscreen && renderTargetRef.current && setTexture) {
      // Restore texture when switching back to minimized mode
      setTexture(renderTargetRef.current.texture);
      console.log('Restored texture for minimized mode');
    }
  }, [isFullscreen, setTexture, renderTargetRef]);

  // Ensure texture is set when render target is created
  useEffect(() => {
    if (renderTargetRef.current && setTexture && !isFullscreen) {
      setTexture(renderTargetRef.current.texture);
      console.log('Set initial texture for minimized mode');
    }
  }, [renderTargetRef.current, setTexture, isFullscreen]);

  useFrame(() => {
    // Skip render-to-target when in fullscreen mode
    if (isFullscreen || !renderTargetRef.current || !renderTargetCameraRef.current){ 
        gl.setClearColor(0x000000);
        return;
    }
    
    // Render to the render target with fixed camera position
    gl.setRenderTarget(renderTargetRef.current);
    gl.setClearColor(0x000000); // Black for the render target
    gl.clear();
    gl.render(scene, renderTargetCameraRef.current);
    gl.setRenderTarget(null);
    gl.setClearColor(0xffffff); // Reset to white for the main canvas
    
    // Update the texture for PostProcessing to use
    if (renderTargetRef.current && renderTargetRef.current.texture) {
      // This will be used by PostProcessing for CRT effects
      renderTargetRef.current.texture.needsUpdate = true;
    }
  });

  // No rendering yet, just setup
  return null;
} 