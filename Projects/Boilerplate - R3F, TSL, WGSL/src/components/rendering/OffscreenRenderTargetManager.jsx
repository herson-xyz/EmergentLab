import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { RENDER_TARGET_CAMERA } from '../../constants/camera';

export default function OffscreenRenderTargetManager({ renderTargetRef, setTexture, isFullscreen }) {
  const { scene, camera, gl } = useThree();
  const renderTargetCameraRef = useRef();

  useEffect(() => {
    // Clean up previous render target if it exists
    if (renderTargetRef.current) {
      renderTargetRef.current.dispose();
    }
    // Create a fixed-size render target (256x256)
    renderTargetRef.current = new THREE.WebGLRenderTarget(512 , 512 , {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });
    console.log('Created fixed-size WebGLRenderTarget:', renderTargetRef.current);
    if (setTexture) setTexture(renderTargetRef.current.texture);
    
    // Create a perspective camera for the render target using constants
    renderTargetCameraRef.current = new THREE.PerspectiveCamera(
      RENDER_TARGET_CAMERA.fov,
      1, // Fixed aspect ratio of 1 for square render target
      RENDER_TARGET_CAMERA.near,
      RENDER_TARGET_CAMERA.far
    );
    
    // Set fixed position for render target camera
    renderTargetCameraRef.current.position.set(0, 0, 8);
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

  useFrame(() => {
    // Skip render-to-target when in fullscreen mode
    if (isFullscreen || !renderTargetRef.current || !renderTargetCameraRef.current){ 
        gl.setClearColor(0x000000);
        return;
    }
    
    // Render to the render target with fixed camera position
    // No need to copy main camera - render target camera stays fixed
    gl.setRenderTarget(renderTargetRef.current);
    gl.setClearColor(0x000000); // Black for the render target
    gl.clear();
    gl.render(scene, renderTargetCameraRef.current);
    gl.setRenderTarget(null);
    gl.setClearColor(0xffffff); // Reset to white for the main canvas
  });

  // No rendering yet, just setup
  return null;
} 