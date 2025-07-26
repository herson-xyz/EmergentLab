import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { RENDER_TARGET_CAMERA, cameraHelpers } from '../../constants/camera';

export default function RenderTargetPass({ renderTargetRef, setTexture, isFullscreen }) {
  const { scene, camera, gl } = useThree();
  const rtCameraRef = useRef();

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
    const rtSettings = cameraHelpers.createRenderTargetCamera(camera);
    rtCameraRef.current = new THREE.PerspectiveCamera(
      rtSettings.fov,
      rtSettings.aspect,
      rtSettings.near,
      rtSettings.far
    );
    rtCameraRef.current.position.copy(camera.position);
    rtCameraRef.current.rotation.copy(camera.rotation);
    rtCameraRef.current.up.copy(camera.up);
    rtCameraRef.current.lookAt(0, 0, 0);
    
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
    if (isFullscreen || !renderTargetRef.current || !rtCameraRef.current){ 
        gl.setClearColor(0x000000);
        return;
    }
    
    // Sync the render target camera to the main camera (for controls)
    rtCameraRef.current.position.copy(camera.position);
    rtCameraRef.current.position.z += 4;
    rtCameraRef.current.rotation.copy(camera.rotation);
    rtCameraRef.current.up.copy(camera.up);
    rtCameraRef.current.updateProjectionMatrix();
    // Render to the render target with the RT camera
    gl.setRenderTarget(renderTargetRef.current);
    gl.setClearColor(0x000000); // Black for the render target
    gl.clear();
    gl.render(scene, rtCameraRef.current);
    gl.setRenderTarget(null);
    gl.setClearColor(0xffffff); // Reset to white for the main canvas
  });

  // No rendering yet, just setup
  return null;
}
