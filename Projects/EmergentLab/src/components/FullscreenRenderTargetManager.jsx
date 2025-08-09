import { useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function FullscreenRenderTargetManager({ renderTargetRef, setTexture, isFullscreen, offscreenScene, offscreenCamera }) {
  const { scene, camera, gl, size } = useThree();

  // Create dynamic render target that matches window size
  const renderTarget = useMemo(() => {
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
    } else if (isFullscreen && renderTargetRef.current && setTexture) {
      setTexture(renderTargetRef.current.texture);
    }
  }, [isFullscreen, setTexture, renderTargetRef]);

  useFrame(() => {
    // Only render to target when in fullscreen mode
    if (!isFullscreen || !renderTargetRef.current) {
      return;
    }

    // Choose scene and camera
    const srcScene = offscreenScene?.current || scene;
    const srcCamera = offscreenCamera?.current || camera;

    // If using an offscreen camera, mirror the main camera pose/projection so OrbitControls apply
    if (offscreenCamera?.current) {
      const dst = offscreenCamera.current;
      const src = camera;

      // Pose
      dst.position.copy(src.position);
      dst.quaternion.copy(src.quaternion);

      // Projection
      dst.fov = src.fov;
      dst.near = src.near;
      dst.far = src.far;
      dst.aspect = Math.max(1e-6, size.width / size.height);
      dst.updateProjectionMatrix();
      dst.updateMatrixWorld();
    }

    // Use chosen camera/scene
    gl.setRenderTarget(renderTargetRef.current);
    gl.setClearColor(0x000000);
    gl.clear();
    gl.render(srcScene, srcCamera);
    gl.setRenderTarget(null);
    gl.setClearColor(0x000000);
  });

  return null;
} 