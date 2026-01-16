/**
 * Upload Engine - Optimized for high-resolution uploaded images (2K-4K)
 * 
 * Preprocessing:
 * - Sharpening for crisp edge detection
 * - CLAHE for contrast normalization
 * - Higher quality thresholds
 */

import { loadOpenCV } from '../omrEngine';

export interface UploadPreprocessResult {
    processedImage: any; // cv.Mat
    originalWidth: number;
    originalHeight: number;
}

/**
 * Preprocess uploaded image for OMR grading
 * Optimized for higher resolution images with cleaner input
 */
export const preprocessUploadImage = async (
    imageSource: HTMLCanvasElement | HTMLImageElement | string
): Promise<UploadPreprocessResult> => {
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

    // === UPLOAD-SPECIFIC PREPROCESSING ===

    // 1. Resize to standard width for consistent processing
    // For uploads, we can use slightly higher resolution for accuracy
    const TARGET_WIDTH = 1200;
    const scale = TARGET_WIDTH / originalWidth;
    const newHeight = Math.round(originalHeight * scale);
    const resized = new cv.Mat();
    cv.resize(src, resized, new cv.Size(TARGET_WIDTH, newHeight));

    // 2. Convert to grayscale
    const gray = new cv.Mat();
    cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY);

    // 3. Apply sharpening kernel for crisp edges
    const sharpened = new cv.Mat();
    const sharpenKernel = cv.matFromArray(3, 3, cv.CV_32F, [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ]);
    cv.filter2D(gray, sharpened, cv.CV_8U, sharpenKernel);
    sharpenKernel.delete();

    // 4. CLAHE (Contrast Limited Adaptive Histogram Equalization)
    // Great for scanned documents with uneven lighting
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    const equalized = new cv.Mat();
    clahe.apply(sharpened, equalized);
    clahe.delete();

    // Cleanup intermediate
    src.delete();
    resized.delete();
    gray.delete();
    sharpened.delete();

    return {
        processedImage: equalized,
        originalWidth,
        originalHeight
    };
};

/**
 * Apply document-specific enhancement
 * Optimized for printed/scanned OMR sheets
 */
export const applyDocumentEnhancement = (cv: any, src: any): any => {
    const dst = new cv.Mat();

    // Morphological operations to clean up document noise
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
    cv.morphologyEx(src, dst, cv.MORPH_CLOSE, kernel);
    kernel.delete();

    return dst;
};

export default {
    preprocessUploadImage,
    applyDocumentEnhancement
};
