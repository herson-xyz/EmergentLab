import { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';

export default function RenderTargetPass({ renderTargetRef, setTexture }) {
  const { size, scene, camera, gl } = useThree();

  useEffect(() => {
    // Clean up previous render target if it exists
    if (renderTargetRef.current) {
      renderTargetRef.current.dispose();
    }
    // Create a new render target matching the canvas size
    renderTargetRef.current = new THREE.WebGLRenderTarget(size.width, size.height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });
    console.log('Created WebGLRenderTarget:', renderTargetRef.current);
    if (setTexture) setTexture(renderTargetRef.current.texture);
    // Clean up on unmount
    return () => {
      if (renderTargetRef.current) {
        renderTargetRef.current.dispose();
      }
    };
  }, [size.width, size.height, renderTargetRef, setTexture]);

  useFrame(() => {
    if (!renderTargetRef.current) return;
    gl.setRenderTarget(renderTargetRef.current);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    console.log('Rendered to render target', renderTargetRef.current);
  });

  // No rendering yet, just setup
  return null;
}
