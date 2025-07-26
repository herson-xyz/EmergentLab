// Camera settings for both main camera and render target camera

// Main camera settings (for rendering to screen)
export const MAIN_CAMERA = {
  position: [0, 0, 8],
  fov: 75,
  near: 0.1,
  far: 1000,
  // Additional settings can be added here
};

// Render target camera settings (for rendering to offscreen target)
export const RENDER_TARGET_CAMERA = {
  // Use same FOV and near/far as main camera for consistency
  fov: MAIN_CAMERA.fov,
  near: MAIN_CAMERA.near,
  far: MAIN_CAMERA.far,
  // Fixed aspect ratio for square render target
  aspect: 1,
  // Can have different position if needed
  position: MAIN_CAMERA.position,
};

// Camera presets for different modes or scenarios
export const CAMERA_PRESETS = {
  default: {
    main: MAIN_CAMERA,
    renderTarget: RENDER_TARGET_CAMERA,
  },
  // Add more presets as needed
  // closeUp: { ... },
  // wideAngle: { ... },
};

// Helper functions for camera management
export const cameraHelpers = {
  // Create a render target camera with current main camera settings
  createRenderTargetCamera: (mainCamera) => ({
    fov: mainCamera.fov || MAIN_CAMERA.fov,
    near: mainCamera.near || MAIN_CAMERA.near,
    far: mainCamera.far || MAIN_CAMERA.far,
    aspect: RENDER_TARGET_CAMERA.aspect,
    position: mainCamera.position || MAIN_CAMERA.position,
  }),
  
  // Get camera settings for a specific mode
  getCameraSettings: (mode = 'default') => CAMERA_PRESETS[mode] || CAMERA_PRESETS.default,
}; 