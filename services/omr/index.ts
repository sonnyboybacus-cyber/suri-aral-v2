/**
 * OMR Engine Module Exports
 * 
 * This barrel file exports the specialized engines for different input sources.
 */

export { preprocessCameraImage, applyCameraNoiseReduction } from './cameraEngine';
export { preprocessUploadImage, applyDocumentEnhancement } from './uploadEngine';

// Re-export types
export type { CameraPreprocessResult } from './cameraEngine';
export type { UploadPreprocessResult } from './uploadEngine';
