import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function FullscreenQuad({ texture }) {
  const { gl, size } = useThree();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const meshRef = useRef();

  // Setup scene, camera, and mesh once
  useEffect(() => {
    // Create scene
    sceneRef.current = new THREE.Scene();
    // Create orthographic camera covering NDC
    cameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // Create fullscreen quad mesh
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({ map: null, toneMapped: false });
    meshRef.current = new THREE.Mesh(geometry, material);
    sceneRef.current.add(meshRef.current);
    return () => {
      geometry.dispose();
      material.dispose();
      sceneRef.current.remove(meshRef.current);
    };
  }, []);

  // Update material's map when texture changes
  useEffect(() => {
    if (meshRef.current && texture) {
      meshRef.current.material.map = texture;
      meshRef.current.material.needsUpdate = true;
      console.log('FullscreenQuad received texture', texture);
    }
  }, [texture]);

  // Render the fullscreen quad scene after the main scene
  useFrame(() => {
    if (!sceneRef.current || !cameraRef.current) return;
    gl.setRenderTarget(null); // Render to screen
    gl.clearDepth(); // Clear depth buffer so quad is always visible
    gl.render(sceneRef.current, cameraRef.current);
  }, 1); // Priority 1: after default scene

  // This component does not render anything in the React tree
  return null;
} 