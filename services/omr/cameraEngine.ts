/**
 * Camera Engine - Optimized for live camera captures (720p-1080p)
 * 
 * Preprocessing:
 * - Noise reduction for lighting variations
 * - Bilateral filter for edge preservation
 * - Lower thresholds for real-time performance
 */

import { loadOpenCV } from '../omrEngine';

export interface CameraPreprocessResult {
    processedImage: any; // cv.Mat
    originalWidth: number;
    originalHeight: number;
}

/**
 * Preprocess camera capture for OMR grading
 * Optimized for lower resolution captures with potential lighting issues
 */
export const preprocessCameraImage = async (
    imageSource: HTMLCanvasElement | HTMLImageElement | string
): Promise<CameraPreprocessResult> => {
    await loadOpenCV();
    const cv = window.cv;

    // Load image
    let src: any;
    if (typeof imageSource === 'string') {
        // Data URL or URL
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = imageSource;
        });
        src = cv.imread(img);
    } else {
        src = cv.imread(imageSource);
    }

    const originalWidth = src.cols;
    const originalHeight = src.rows;

    // === CAMERA-SPECIFIC PREPROCESSING ===

    // 1. Resize to standard width for consistent processing
    const TARGET_WIDTH = 1000;
    const scale = TARGET_WIDTH / originalWidth;
    const newHeight = Math.round(originalHeight * scale);
    const resized = new cv.Mat();
    cv.resize(src, resized, new cv.Size(TARGET_WIDTH, newHeight));

    // 2. Convert to grayscale
    const gray = new cv.Mat();
    cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY);

    // 3. Bilateral filter - reduces noise while preserving edges
    // This is great for camera captures with uneven lighting
    const bilateral = new cv.Mat();
    cv.bilateralFilter(gray, bilateral, 9, 75, 75);

    // 4. Slight contrast enhancement (CLAHE-like)
    // For camera captures, this helps with shadows
    const normalized = new cv.Mat();
    cv.normalize(bilateral, normalized, 0, 255, cv.NORM_MINMAX);

    // Cleanup intermediate
    src.delete();
    resized.delete();
    gray.delete();
    bilateral.delete();

    return {
        processedImage: normalized,
        originalWidth,
        originalHeight
    };
};

/**
 * Apply noise reduction to camera frame
 * More aggressive than upload engine
 */
export const applyCameraNoiseReduction = (cv: any, src: any): any => {
    const dst = new cv.Mat();

    // Gaussian blur to reduce camera sensor noise
    const ksize = new cv.Size(3, 3);
    cv.GaussianBlur(src, dst, ksize, 0);

    return dst;
};

export default {
    preprocessCameraImage,
    applyCameraNoiseReduction
};
