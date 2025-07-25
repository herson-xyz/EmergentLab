import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function RenderTargetPass() {
  const { size } = useThree();
  const renderTargetRef = useRef();

  useEffect(() => {
    if (renderTargetRef.current) {
      renderTargetRef.current.dispose();
    }

    renderTargetRef.current = new THREE.WebGLRenderTarget(size.width, size.height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });

    console.log('Created render target:', renderTargetRef.current);

    return () => {
      if (renderTargetRef.current) {
        renderTargetRef.current.dispose();
      }
    };
  }, [size.width, size.height]);

  return null;
}
