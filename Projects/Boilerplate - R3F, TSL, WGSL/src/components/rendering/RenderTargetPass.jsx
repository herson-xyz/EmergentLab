import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { RENDER_TARGET_CAMERA } from '../../constants/camera';

export default function RenderTargetPass({ renderTargetRef, setTexture, isFullscreen }) {
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
      RENDER_TARGET_CAMERA.aspect,
      RENDER_TARGET_CAMERA.near,
      RENDER_TARGET_CAMERA.far
    );
    renderTargetCameraRef.current.position.copy(camera.position);
    renderTargetCameraRef.current.rotation.copy(camera.rotation);
    renderTargetCameraRef.current.up.copy(camera.up);
    renderTargetCameraRef.current.lookAt(0, 0, 0);
    
    // Clean up on unmount
    return () => {
      if (renderTargetRef.current) {
        renderTargetRef.current.dispose();
      }
    };
  }, [renderTargetRef, setTexture, camera.fov, camera.near, camera.far, camera.position, camera.rotation, camera.up]);

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
    
    // Sync the render target camera to the main camera (for controls)
    renderTargetCameraRef.current.position.copy(camera.position);
    renderTargetCameraRef.current.position.z += 0;
    renderTargetCameraRef.current.rotation.copy(camera.rotation);
    renderTargetCameraRef.current.up.copy(camera.up);
    renderTargetCameraRef.current.updateProjectionMatrix();
    // Render to the render target with the RT camera
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
