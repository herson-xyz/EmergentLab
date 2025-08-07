import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function OffscreenDisplayAsQuad({ texture }) {
  const { gl, size } = useThree();
  const aspect = size.width / size.height;
  const sceneRef = useRef();
  const cameraRef = useRef();
  const meshRef = useRef();

  // Setup scene, camera, and mesh once
  useEffect(() => {
    sceneRef.current = new THREE.Scene();
    cameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // Always use a square geometry
    const geometry = new THREE.PlaneGeometry(1.75, 1.75);
    // Flip UV coordinates to correct Y coordinate system
    geometry.attributes.uv.array[1] = 1 - geometry.attributes.uv.array[1];
    geometry.attributes.uv.array[3] = 1 - geometry.attributes.uv.array[3];
    geometry.attributes.uv.array[5] = 1 - geometry.attributes.uv.array[5];
    geometry.attributes.uv.array[7] = 1 - geometry.attributes.uv.array[7];
    const material = new THREE.MeshBasicMaterial({ 
      map: null, 
      toneMapped: false,
      transparent: true
    });
    meshRef.current = new THREE.Mesh(geometry, material);
    meshRef.current.position.set(0, 0, 0); // Centered
    sceneRef.current.add(meshRef.current);
    return () => {
      geometry.dispose();
      material.dispose();
      sceneRef.current.remove(meshRef.current);
    };
  }, []);

  // Update mesh scale on resize to maintain square appearance
  useEffect(() => {
    if (meshRef.current) {
      if (aspect >= 1) {
        // Wide window: shrink X
        meshRef.current.scale.set(1 / aspect, 1, 1);
      } else {
        // Tall window: shrink Y
        meshRef.current.scale.set(1, aspect, 1);
      }
    }
  }, [aspect]);

  // Update material's map when texture changes
  useEffect(() => {
    if (meshRef.current && texture) {
      meshRef.current.material.map = texture;
      // Flip the texture vertically to match coordinate systems
      texture.flipY = false;
      meshRef.current.material.needsUpdate = true;
    }
  }, [texture]);

  useFrame(() => {
    if (!sceneRef.current || !cameraRef.current) return;
    gl.setRenderTarget(null); // Render to screen
    gl.clearDepth(); // Clear depth buffer so quad is always visible
    gl.render(sceneRef.current, cameraRef.current);
  }, 1); // Priority 1: after default scene

  return null;
} 