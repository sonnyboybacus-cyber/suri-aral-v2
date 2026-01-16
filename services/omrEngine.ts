import { preprocessCameraImage } from './omr/cameraEngine';
import { preprocessUploadImage } from './omr/uploadEngine';
import { predictBubble } from './ai/bubbleClassifier'; // Import AI Service

export type OMRSourceType = 'camera' | 'upload';

declare global {
    interface Window {
        cv: any;
        cvPromise: Promise<void>;
    }
}

export const OMR_ITEM_OPTIONS = [15, 25, 30, 40, 50, 60, 75];

// OMR Calibration Constants
interface LayoutCalibration {
    minX: number; // Left margin for bubble detection (ignores item numbers)
    minY: number; // Top margin
    fillThreshold: number; // Pixel fill ratio to consider "marked"
    innerROIPadding: number; // Percentage to shrink ROI (ignore bubble borders)
    slotTolerance: number; // Max distance from slot center to bubble center
    minArea: number; // Min bubble area
    arMin: number; // Aspect ratio min
    arMax: number; // Aspect ratio max
    threshBlockSize: number; // Adaptive threshold block size
}

interface TemplateConfig {
    isSingleColumn: boolean;
    leftColumnRows: number;
    rightColumnRows: number;
    columns?: number; // For 4-column layouts
}

const LAYOUT_CALIBRATION: Record<number, LayoutCalibration> = {
    // minY increased to 370 because Fiducials are now at PAGE CORNERS (Y=10 to Y=277).
    // The Header (Y=0 to Y=80) is included in the warp but must be ignored.
    // 70mm gap / 190mm width * 1000px width ≈ 368px. Rounded to 370.
    15: { minX: 100, minY: 370, fillThreshold: 0.50, innerROIPadding: 0.40, slotTolerance: 40, minArea: 100, arMin: 0.6, arMax: 1.4, threshBlockSize: 99 },
    25: { minX: 100, minY: 370, fillThreshold: 0.50, innerROIPadding: 0.40, slotTolerance: 40, minArea: 100, arMin: 0.6, arMax: 1.4, threshBlockSize: 99 },
    30: { minX: 100, minY: 370, fillThreshold: 0.35, innerROIPadding: 0.40, slotTolerance: 40, minArea: 100, arMin: 0.7, arMax: 1.3, threshBlockSize: 99 },
    40: { minX: 100, minY: 370, fillThreshold: 0.35, innerROIPadding: 0.40, slotTolerance: 40, minArea: 100, arMin: 0.7, arMax: 1.3, threshBlockSize: 99 },
    50: { minX: 100, minY: 370, fillThreshold: 0.35, innerROIPadding: 0.40, slotTolerance: 40, minArea: 100, arMin: 0.7, arMax: 1.3, threshBlockSize: 99 },
    60: { minX: 100, minY: 370, fillThreshold: 0.35, innerROIPadding: 0.40, slotTolerance: 40, minArea: 100, arMin: 0.7, arMax: 1.3, threshBlockSize: 99 },
    75: { minX: 100, minY: 370, fillThreshold: 0.35, innerROIPadding: 0.40, slotTolerance: 40, minArea: 100, arMin: 0.7, arMax: 1.3, threshBlockSize: 99 },
};

// Fallback logic helpers
const getLayoutCalibration = (items: number): LayoutCalibration => {
    return LAYOUT_CALIBRATION[items] || LAYOUT_CALIBRATION[50];
};

const TEMPLATE_CONFIGS: Record<number, TemplateConfig> = {
    15: { isSingleColumn: true, leftColumnRows: 15, rightColumnRows: 0 },
    25: { isSingleColumn: true, leftColumnRows: 25, rightColumnRows: 0 },
    30: { isSingleColumn: false, leftColumnRows: 25, rightColumnRows: 5 },
    40: { isSingleColumn: false, leftColumnRows: 20, rightColumnRows: 20 },
    50: { isSingleColumn: false, leftColumnRows: 25, rightColumnRows: 25 },
    60: { isSingleColumn: false, leftColumnRows: 30, rightColumnRows: 30 },
    75: { isSingleColumn: false, leftColumnRows: 25, rightColumnRows: 50 },
};

export const loadOpenCV = (): Promise<void> => {
    if (window.cv && window.cv.Mat) return Promise.resolve();
    if (window.cvPromise) return window.cvPromise;
    window.cvPromise = new Promise((resolve, reject) => {
        let attempts = 0;
        const checkCV = setInterval(() => {
            attempts++;
            if (window.cv && window.cv.Mat) {
                clearInterval(checkCV);
                resolve();
            } else if (window.cv && window.cv.getBuildInformation) {
                clearInterval(checkCV);
                resolve();
            } else if (attempts > 200) {
                clearInterval(checkCV);
                reject(new Error("Timeout waiting for OpenCV to load from index.html"));
            }
        }, 50);
    });
    return window.cvPromise;
};

// Helper to delegate preprocessing
const getProcessedImage = async (
    imageSource: HTMLImageElement | HTMLCanvasElement | string,
    type: OMRSourceType
) => {
    if (type === 'camera') {
        return await preprocessCameraImage(imageSource);
    } else {
        return await preprocessUploadImage(imageSource);
    }
};

// --- HELPER: SORT CONTOURS ---
const sortContours = (cnts: any[], method: "top-to-bottom" | "left-to-right" = "left-to-right"): any[] => {
    const reverse = false;
    const sorted = cnts.sort((a, b) => {
        const ra = window.cv.boundingRect(a);
        const rb = window.cv.boundingRect(b);
        if (method === "left-to-right") return ra.x - rb.x;
        else return ra.y - rb.y;
    });
    return sorted;
};

export interface DebugBubble {
    x: number;
    y: number;
    w: number;
    h: number;
    fill: number; // 0-1
    label: string; // "A", "B"...
    itemIndex: number; // 1-based (e.g. 1..50)
    isMarked: boolean;
    colOffset: { x: number, y: number }; // Relative to warped image
}

interface ColumnResult { // Not exported? Wait.
    answers: string[];
    bubbles: DebugBubble[];
    anchors?: { x: number, y: number, r: number }[]; // x,y center, r radius
    warpedImage?: string; // DataURL
}

// 5. GRADE SINGLE COLUMN (Now Async for AI)
export const processSingleColumnImage = async (
    cv: any,
    colMat: any, // The WARPED column image (cv.Mat)
    expectedItems: number,
    calibration: { minY: number, maxY: number, pitch?: number },
    colLabel: string = "Col",
    startItemIndex: number = 0,
    globalOffset: { x: number, y: number } = { x: 0, y: 0 },
    scanOffset: { x: number, y: number } = { x: 0, y: 0 } // NEW: Manual Nudge
): Promise<ColumnResult> => { // Returns specific structure
    // CONSTANTS FOR 1000px WIDTH (190mm physical width)
    const PX_PER_MM = 1000 / 190; // ~5.26 px/mm
    const ANCHOR_SIZE_MM = 3.0;
    const ANCHOR_MIN_AREA_MM2 = 2; // Min Area in mm^2 (e.g., 2mm x 1mm)
    const ANCHOR_MAX_AREA_MM2 = 25; // Max Area in mm^2 (e.g., 5mm x 5mm)
    // Offset Logic:
    // Anchor X (Left Edge) = xBase - 4.5. Width = 3. Center = xBase - 3.0.
    // Bubble A X (Center) = xBase + 10.
    // Dist = 10 - (-3.0) = 13.0 mm.
    const ANCHOR_TO_A_OFFSET_MM = 13.0;
    const BUBBLE_SPACING_MM = 9.0;

    // (A) Preprocessing inside the slice
    const gray = new cv.Mat();
    if (colMat.channels() > 1) {
        cv.cvtColor(colMat, gray, cv.COLOR_RGBA2GRAY);
    } else {
        colMat.copyTo(gray);
    }

    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // const calibration = getLayoutCalibration(expectedItems); // Removed, now passed in
    const binary = new cv.Mat();
    // Use lower block size for local contrast adaptation
    cv.adaptiveThreshold(blurred, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 51, 5);

    // MORPHOLOGICAL CLOSING (Fill gaps in pencil marks)
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    const closed = new cv.Mat();
    cv.morphologyEx(binary, closed, cv.MORPH_CLOSE, kernel);

    // Reuse closed binary for contours
    const cnts = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(closed, cnts, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // 1. DETECT ELEMENTS
    const anchors: any[] = [];

    // Relaxed filters for Camera
    for (let i = 0; i < cnts.size(); i++) {
        const c = cnts.get(i);
        const rect = cv.boundingRect(c);
        const ar = rect.width / rect.height;
        const area = cv.contourArea(c);
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;

        if (cy < calibration.minY) continue;

        // Solidity Check (Area / RectArea)
        // A square anchor fill is near 1.0 (0.9-1.0)
        // Text characters (like "I" or "T") have lower solidity or different AR
        const solidity = area / (rect.width * rect.height);

        // Anchor: 3mm square = ~250px area.
        // Allow range 80 - 600 (Raised min from 50 to 80 to avoid small text noise)
        // Added solidity > 0.85 check
        if (area > 80 && area < 600 && ar > 0.6 && ar < 1.4 && solidity > 0.85) {
            anchors.push({ c, cx, cy, rect, area });
        }
    }

    // 2. IDENTIFY ANCHOR LINE (Leftmost Vertical Column)
    // Find peak X
    const xBins = new Array(Math.ceil(colMat.cols / 10)).fill(0);
    anchors.forEach(a => {
        const bin = Math.floor(a.cx / 10);
        if (bin < xBins.length) xBins[bin]++;
    });

    let anchorXPeak = -1;
    // Search left-to-right for first strong peak (>3 items)
    for (let i = 0; i < xBins.length; i++) {
        if (xBins[i] >= 3) {
            anchorXPeak = i * 10 + 5;
            break;
        }
    }

    let validAnchors: any[] = [];
    if (anchorXPeak !== -1) {
        validAnchors = anchors.filter(a => Math.abs(a.cx - anchorXPeak) < 25); // +/- 25px
        validAnchors.sort((a, b) => a.cy - b.cy);
    }

    // 3. REFINE ROW Ys
    let medianPitch = 0;
    if (validAnchors.length > 1) {
        const gaps = [];
        for (let i = 1; i < validAnchors.length; i++) {
            gaps.push(validAnchors[i].cy - validAnchors[i - 1].cy);
        }
        gaps.sort((a, b) => a - b);
        medianPitch = gaps[Math.floor(gaps.length / 2)];
    }

    // Scale Logic
    const ROW_HEIGHT_MM = 7.6; // From pdfGenerator
    // If pitch is unreasonable (e.g. < 20px), fallback to standard
    const STANDARD_PITCH = 50;

    // Safety check for pitch
    let usedPitch = medianPitch;
    if (usedPitch < 25 || usedPitch > 120) {
        usedPitch = STANDARD_PITCH;
        console.warn(`[OMR] Pitch outlier (${medianPitch}), using standard (${STANDARD_PITCH})`);
    }

    // DYNAMIC SCALE FACTOR
    const dynamicPxPerMm = usedPitch / ROW_HEIGHT_MM;
    console.log(`[OMR] Dynamic Scale: ${dynamicPxPerMm.toFixed(2)} px/mm (Pitch: ${usedPitch})`);

    // Reconstruct Grid Rows
    // Start from First Anchor, project downwards with Median Pitch.
    // Align with existing anchors where possible to correct drift.
    let rowYs: number[] = [];
    if (validAnchors.length > 0) {
        // Interpolate Logic
        for (let i = 0; i < validAnchors.length - 1; i++) {
            const a1 = validAnchors[i];
            const a2 = validAnchors[i + 1];
            rowYs.push(a1.cy);

            const dist = a2.cy - a1.cy;
            // Round to nearest pitch multiple
            const missedRows = Math.round(dist / usedPitch) - 1;
            if (missedRows > 0) {
                const step = dist / (missedRows + 1);
                for (let k = 1; k <= missedRows; k++) {
                    rowYs.push(a1.cy + step * k);
                }
            }
        }
        rowYs.push(validAnchors[validAnchors.length - 1].cy);

        // --- PHASE 4V: TOP ROW BACKFILL ---
        // Determine if we missed the first row(s) because the top anchor was not detected.
        // Heuristic: Check 1 pitch ABOVE the first detected row.
        // If there are bubbles there, we backfill.

        const firstY = rowYs[0];
        const checkY = firstY - usedPitch;

        // Only check if we are still well within image bounds (> minY)
        if (checkY > calibration.minY) {
            // How to check? Scan the horizontal slots at checkY
            // We need slotCenters (calculated later). Let's calc temporary ones here.
            // Simplified: Just use same logic as grading.

            const anchorX = anchorXPeak !== -1 ? anchorXPeak : 50;
            const dynamicPx = usedPitch / ROW_HEIGHT_MM;
            const offA = ANCHOR_TO_A_OFFSET_MM * dynamicPx;
            const pitchX = BUBBLE_SPACING_MM * dynamicPx;
            const rad = Math.floor(2.6 * dynamicPx * 0.9);

            const tempSlots = [
                anchorX + offA,
                anchorX + offA + pitchX,
                anchorX + offA + pitchX * 2,
                anchorX + offA + pitchX * 3
            ];

            let markedCount = 0;
            tempSlots.forEach(cx => {
                const x = Math.max(0, cx - rad);
                const y = Math.max(0, checkY - rad);
                if (x + rad * 2 < closed.cols && y + rad * 2 < closed.rows) {
                    const roi = closed.roi(new cv.Rect(x, y, rad * 2, rad * 2));
                    const fill = cv.countNonZero(roi) / (rad * 2 * rad * 2);
                    roi.delete();
                    if (fill > 0.25) markedCount++; // Strong signal check
                }
            });

            if (markedCount > 0) {
                console.log(`[OMR ${colLabel}] Detected missing top row at Y=${checkY.toFixed(1)}. Backfilling.`);
                rowYs.unshift(checkY);

                // Double check 2 rows up? (Unlikely for camera, but possible)
                const checkY2 = checkY - usedPitch;
                if (checkY2 > calibration.minY) {
                    let markedCount2 = 0;
                    tempSlots.forEach(cx => {
                        const x = Math.max(0, cx - rad);
                        const y = Math.max(0, checkY2 - rad);
                        if (x + rad * 2 < closed.cols && y + rad * 2 < closed.rows) {
                            const roi = closed.roi(new cv.Rect(x, y, rad * 2, rad * 2));
                            const fill = cv.countNonZero(roi) / (rad * 2 * rad * 2);
                            roi.delete();
                            if (fill > 0.25) markedCount2++;
                        }
                    });
                    if (markedCount2 > 0) {
                        rowYs.unshift(checkY2);
                    }
                }
            }
        }
    } else {
        console.warn(`[OMR] No anchors found for ${colLabel}. Using heuristic.`);
    }

    // 4. DETERMINE SLOT X-COORDINATES
    const anchorX = anchorXPeak !== -1 ? anchorXPeak : 50;

    // Use DYNAMIC SCALE for precision
    const OFFSET_A_PX = ANCHOR_TO_A_OFFSET_MM * dynamicPxPerMm;
    const PITCH_PX = BUBBLE_SPACING_MM * dynamicPxPerMm;

    const slotCenters = [
        anchorX + OFFSET_A_PX,
        anchorX + OFFSET_A_PX + PITCH_PX,
        anchorX + OFFSET_A_PX + PITCH_PX * 2,
        anchorX + OFFSET_A_PX + PITCH_PX * 3
    ];

    console.log(`[OMR ${colLabel}] AnchorX: ${anchorX} (${anchorXPeak !== -1 ? 'Locked' : 'Est'}), OffsetA: ${OFFSET_A_PX.toFixed(1)}, Pitch: ${PITCH_PX.toFixed(1)}`);

    // 5. GRADE
    const answers: string[] = [];
    const debugBubbles: DebugBubble[] = [];

    // Pad Rows if necessary
    // A) Internal Interpolation (Fix missing middle rows caused by faded anchors)
    rowYs.sort((a, b) => a - b);
    const interpolatedYs: number[] = [];
    if (rowYs.length > 0) {
        interpolatedYs.push(rowYs[0]);
        for (let i = 0; i < rowYs.length - 1; i++) {
            const current = rowYs[i];
            const next = rowYs[i + 1];
            const gap = next - current;

            // If gap is approx 2x pitch (or more), we missed a row
            if (gap > usedPitch * 1.5) {
                const missingCount = Math.round(gap / usedPitch) - 1;
                for (let k = 1; k <= missingCount; k++) {
                    interpolatedYs.push(current + (usedPitch * k));
                }
            }
            interpolatedYs.push(next);
        }
        rowYs = interpolatedYs;
    }

    // B) Tail Padding (Fix missing bottom rows)
    if (rowYs.length > 0 && rowYs.length < expectedItems) {
        const lastY = rowYs[rowYs.length - 1];
        const missing = expectedItems - rowYs.length;
        for (let k = 1; k <= missing; k++) {
            rowYs.push(lastY + usedPitch * k);
        }
    } else if (rowYs.length === 0) {
        // Absolute fallback if NO anchors found
        // Use STANDARD pitch from MinY
        let y = calibration.minY + 20; // Guess
        for (let k = 0; k < expectedItems; k++) {
            answers.push(''); // Fail safe
        }
        // Cleanup
        gray.delete(); blurred.delete(); binary.delete(); closed.delete(); kernel.delete(); cnts.delete(); hierarchy.delete();
        return { answers, bubbles: [] };
    }

    // Dynamic Bubble Radius (2.6mm radius -> 5.2mm dia)
    // Radius in px = 2.6 * scale.
    // Add 20% margin for error? No, let's keep it tight to avoid overlap.
    const BUBBLE_RADIUS_MM = 2.6;
    const BUBBLE_RADIUS = Math.floor(BUBBLE_RADIUS_MM * dynamicPxPerMm * 0.9); // 0.9 safety factor

    // For Camera, the fill ratio is often lower due to gray blending.
    const ABSOLUTE_MIN = 0.20; // Lowered from 0.25 (Base Heuristic)
    const FILL_THRESHOLD_REL = 0.15; // Lowered from 0.20

    const map = ['A', 'B', 'C', 'D'];

    // --- PHASE 5A: COLLECT BUBBLES ---
    // We collect ALL bubbles first to batch-process them with AI (faster)
    interface BubbleCandidate {
        r: number; // Row Index (relative)
        slotIdx: number; // 0-3 (A-D)
        mat: any; // CV Mat
        bubbleIndex: number; // Index in debugBubbles array
        fill: number; // Pixel fill (keep for debug/fallback)
    }
    const candidates: BubbleCandidate[] = [];

    for (let r = 0; r < expectedItems; r++) {
        if (r >= rowYs.length) {
            answers.push('');
            continue;
        }

        const rowY = rowYs[r];

        slotCenters.forEach((cx, slotIdx) => {
            const x = Math.max(0, cx - BUBBLE_RADIUS + scanOffset.x);
            const y = Math.max(0, rowY - BUBBLE_RADIUS + scanOffset.y);
            const w = BUBBLE_RADIUS * 2;
            const h = BUBBLE_RADIUS * 2;

            let fill = 0;
            let bubbleMat = null;

            if (x + w < closed.cols && y + h < closed.rows) {
                // 1. Calculate Fill (Just for debug/logging)
                const roi = closed.roi(new cv.Rect(x, y, w, h));
                fill = cv.countNonZero(roi) / (w * h);
                roi.delete();

                // 2. Crop Image for AI (From Grayscale Source)
                if (x + w < colMat.cols && y + h < colMat.rows) {
                    bubbleMat = colMat.roi(new cv.Rect(x, y, w, h));
                }
            }

            // Create Debug Info (Initial state: Unmarked)
            const bubbleIndex = debugBubbles.length;
            debugBubbles.push({
                x: x + globalOffset.x,
                y: y + globalOffset.y,
                w: w,
                h: h,
                fill: fill,
                label: map[slotIdx],
                itemIndex: startItemIndex + r,
                isMarked: false,
                colOffset: globalOffset
            });

            if (bubbleMat) {
                candidates.push({ r, slotIdx, mat: bubbleMat, bubbleIndex, fill });
            }
        });

        // Push placeholder for answer (will update later)
        answers.push('');
    }

    // --- PHASE 5B: BATCH AI PREDICTION ---
    // Run AI on all candidates in parallel
    console.time("AI_Batch");

    // Helper to process one candidate
    const processCandidate = async (c: BubbleCandidate) => {
        try {
            // OpenCV -> Canvas
            const canvas = document.createElement('canvas');
            canvas.width = c.mat.cols;
            canvas.height = c.mat.rows;
            cv.imshow(canvas, c.mat);
            c.mat.delete(); // Cleanup Mat immediately

            // Predict
            const aiResult = await predictBubble(canvas);

            const label = aiResult.className.toLowerCase();
            const prob = aiResult.probability;
            // Treat "marked" or "filled" as Marked
            const isAiMarked = (label.includes('marked') || label.includes('filled')) && !label.includes('un');

            // Log for debug
            console.log(`[AI] R${c.r}:${map[c.slotIdx]} ${label} (${(prob * 100).toFixed(0)}%) Fill=${c.fill.toFixed(2)}`);

            // SAFETY NET: If fill is substantial (>45%) and AI is just being skeptical, trust the Pixel Count.
            // Raised from 0.30 -> 0.45 to ignore "little darken" / shadows.
            const overrideMarked = c.fill > 0.45;

            // Raised AI Confidence from 0.45 -> 0.60
            const finalMark = (isAiMarked && prob > 0.60) || overrideMarked;

            return {
                ...c,
                isMarked: finalMark,
                prob
            };
        } catch (err) {
            console.error("AI Error", err);
            return { ...c, isMarked: false, prob: 0 };
        }
    };

    const results = await Promise.all(candidates.map(processCandidate));
    console.timeEnd("AI_Batch");

    // --- PHASE 5C: DETERMINE ANSWERS ---
    // Group results by Row
    const rows = new Map<number, typeof results>();
    results.forEach(res => {
        if (!rows.has(res.r)) rows.set(res.r, []);
        rows.get(res.r)?.push(res);
    });

    // Decide "Winner" for each row
    rows.forEach((rowBubbles, r) => {
        // Filter to only those marked by AI
        const marked = rowBubbles.filter(b => b.isMarked);

        // Update Debug Bubbles Status
        rowBubbles.forEach(b => {
            debugBubbles[b.bubbleIndex].isMarked = b.isMarked;
        });

        if (marked.length === 1) {
            // Single Mark - Perfect
            answers[r] = map[marked[0].slotIdx];
        } else if (marked.length > 1) {
            // Multiple Marks - Pick highest confidence
            const winner = marked.reduce((prev, curr) => curr.prob > prev.prob ? curr : prev);
            answers[r] = map[winner.slotIdx];
        } else {
            // No Marks
            answers[r] = '';
        }
    });

    // 5. Clean up
    gray.delete(); blurred.delete(); binary.delete(); closed.delete();
    cnts.delete(); hierarchy.delete();

    // WARPED IMAGE CAPTURE (For Debugging)
    let warpedDataUrl = '';
    // HACK: Use global document if available (we are in React)
    if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        cv.imshow(c, colMat); // Draws colMat to canvas
        warpedDataUrl = c.toDataURL('image/png');
    }

    return {
        answers,
        bubbles: debugBubbles,
        anchors: validAnchors.map(a => ({ x: a.cx + globalOffset.x, y: a.cy + globalOffset.y, r: Math.sqrt(a.area / Math.PI) })), // Export Anchors (Global Coords)
        warpedImage: warpedDataUrl
    };
};


// --- EXPORTS ---

export interface CornerPoints {
    tl: { x: number, y: number };
    tr: { x: number, y: number };
    br: { x: number, y: number };
    bl: { x: number, y: number };
}

// 1. DETECT CORNERS (Step 1 of Interactive Crop)
export const detectPageCorners = async (
    imageSource: HTMLImageElement | HTMLCanvasElement | string,
    sourceType: OMRSourceType = 'upload'
): Promise<CornerPoints> => {
    await loadOpenCV();
    const cv = window.cv;

    // Use Specialized Engine
    const { processedImage: src, originalWidth } = await getProcessedImage(imageSource, sourceType);

    // Calculate Scale Factor (Processed / Original)
    // We need this to map found corners (in processed space) back to original space for the UI
    const scale = src.cols / originalWidth;

    const imgWidth = src.cols;
    const imgHeight = src.rows;

    const blurred = new cv.Mat();
    cv.GaussianBlur(src, blurred, new cv.Size(5, 5), 0);
    const binThresh = new cv.Mat();
    cv.Canny(blurred, binThresh, 50, 150);
    const dilateKernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(binThresh, binThresh, dilateKernel, new cv.Point(-1, -1), 1);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    // Use RETR_TREE to capture nesting (Parent/Child relationships)
    cv.findContours(binThresh, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    // Finding Markers
    const markers: any[] = [];
    const fiducials: any[] = [];

    for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        const rect = cv.boundingRect(cnt);
        const aspectRatio = rect.width / rect.height;

        // Generic Square Marker Candidate
        if (area > 50 && area < 50000 && aspectRatio >= 0.5 && aspectRatio <= 2.0) {
            markers.push({ cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, area });

            // --- FIDUCIAL CHECK (Advanced) ---
            // Check for Nested Square Pattern (Black -> White -> Black)
            // Hierarchy: [Next, Previous, First_Child, Parent]
            // We want a Contour (Outer Black) that has a Child (Middle White) that has a Child (Inner Black)
            // Hierarchy is 1 x N matrix. Access via (0, index).
            const data = hierarchy.intPtr(0, i);
            const childIdx = data[2]; // First_Child is at index 2

            if (childIdx !== -1) {
                const childData = hierarchy.intPtr(0, childIdx);
                const grandChildIdx = childData[2];

                if (grandChildIdx !== -1) {
                    // Found 3 layers of nesting! High confidence fiducial.
                    fiducials.push({ cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, area });
                }
            }
        }
    }

    // Cleanup local Mats
    blurred.delete(); binThresh.delete(); dilateKernel.delete(); contours.delete(); hierarchy.delete();
    // Delete source from engine
    src.delete();

    let corners: CornerPoints | null = null;

    // Strategy 0: Concentric Fiducials (Gold Standard)
    if (fiducials.length >= 4) {
        // Sort finding the 4 most extreme corners
        // Same logic as markers but using the high-confidence fiducials list

        // Basic Extreme Sort
        const tl = fiducials.reduce((prev, curr) => (curr.cx + curr.cy) < (prev.cx + prev.cy) ? curr : prev);
        const br = fiducials.reduce((prev, curr) => (curr.cx + curr.cy) > (prev.cx + prev.cy) ? curr : prev);
        const tr = fiducials.reduce((prev, curr) => (curr.cx - curr.cy) > (prev.cx - prev.cy) ? curr : prev);
        const bl = fiducials.reduce((prev, curr) => (curr.cx - curr.cy) < (prev.cx - prev.cy) ? curr : prev);

        corners = {
            tl: { x: tl.cx, y: tl.cy },
            tr: { x: tr.cx, y: tr.cy },
            br: { x: br.cx, y: br.cy },
            bl: { x: bl.cx, y: bl.cy }
        };
    }

    if (!corners && markers.length >= 4) {
        // Fallback to generic squares
        const tl = markers.reduce((prev, curr) => (curr.cx + curr.cy) < (prev.cx + prev.cy) ? curr : prev);
        const br = markers.reduce((prev, curr) => (curr.cx + curr.cy) > (prev.cx + prev.cy) ? curr : prev);
        const tr = markers.reduce((prev, curr) => (curr.cx - curr.cy) > (prev.cx - prev.cy) ? curr : prev);
        const bl = markers.reduce((prev, curr) => (curr.cx - curr.cy) < (prev.cx - curr.cy) ? curr : prev);

        corners = {
            tl: { x: tl.cx, y: tl.cy },
            tr: { x: tr.cx, y: tr.cy },
            br: { x: br.cx, y: br.cy },
            bl: { x: bl.cx, y: bl.cy }
        };
    }

    if (!corners) {
        // Default
        corners = {
            tl: { x: 0, y: 0 },
            tr: { x: imgWidth, y: 0 },
            br: { x: imgWidth, y: imgHeight },
            bl: { x: 0, y: imgHeight }
        };
    }

    // --- RESCALE CORNERS TO ORIGINAL SPACE ---
    if (scale !== 1 && scale > 0) {
        corners.tl.x /= scale; corners.tl.y /= scale;
        corners.tr.x /= scale; corners.tr.y /= scale;
        corners.br.x /= scale; corners.br.y /= scale;
        corners.bl.x /= scale; corners.bl.y /= scale;
    }

    return corners;
};

// Helper for sorting points to TL, TR, BR, BL
const sortPointsSpatial = (points: any[], w: number, h: number): CornerPoints => {
    // Basic Extreme Sort
    // We assume points are roughly in corners.
    const tl = points.reduce((prev, curr) => (curr.cx + curr.cy) < (prev.cx + prev.cy) ? curr : prev);
    const br = points.reduce((prev, curr) => (curr.cx + curr.cy) > (prev.cx + prev.cy) ? curr : prev);
    const tr = points.reduce((prev, curr) => (curr.cx - curr.cy) > (prev.cx - prev.cy) ? curr : prev);
    const bl = points.reduce((prev, curr) => (curr.cx - curr.cy) < (prev.cx - prev.cy) ? curr : prev);

    return {
        tl: { x: tl.cx, y: tl.cy },
        tr: { x: tr.cx, y: tr.cy },
        br: { x: br.cx, y: br.cy },
        bl: { x: bl.cx, y: bl.cy }
    };
};

// 2. GRADE FROM CORNERS (Step 2 of Interactive Crop)
export const gradeFromCorners = async (
    imageSource: HTMLImageElement | HTMLCanvasElement | string,
    corners: CornerPoints,
    itemCount: number, // Changed from totalItems
    sourceType: OMRSourceType = 'upload',
    manualOffset: { x: number, y: number } = { x: 0, y: 0 } // NEW: Manual Nudge
): Promise<{ answers: string[], confidence: number, debugData?: { bubbles: DebugBubble[], warpedImage: string } }> => {
    await loadOpenCV();
    const cv = window.cv;

    // Use Specialized Engine
    const { processedImage: src, originalWidth } = await getProcessedImage(imageSource, sourceType);

    // Note: corners passed in are in ORIGINAL coordinates (scaled).
    // But 'src' is PROCESSED (scaled down).
    // We need to SCALE DOWN the corners to match 'src'.
    const scale = src.cols / originalWidth;

    // Create SCALED corners for warping
    const scaledCorners = {
        tl: { x: corners.tl.x * scale, y: corners.tl.y * scale },
        tr: { x: corners.tr.x * scale, y: corners.tr.y * scale },
        br: { x: corners.br.x * scale, y: corners.br.y * scale },
        bl: { x: corners.bl.x * scale, y: corners.bl.y * scale },
    };

    // Warp
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        scaledCorners.tl.x, scaledCorners.tl.y, scaledCorners.tr.x, scaledCorners.tr.y,
        scaledCorners.br.x, scaledCorners.br.y, scaledCorners.bl.x, scaledCorners.bl.y
    ]);
    const widthTop = Math.hypot(scaledCorners.tr.x - scaledCorners.tl.x, scaledCorners.tr.y - scaledCorners.tl.y);
    const widthBot = Math.hypot(scaledCorners.br.x - scaledCorners.bl.x, scaledCorners.br.y - scaledCorners.bl.y);
    const heightLeft = Math.hypot(scaledCorners.bl.x - scaledCorners.tl.x, scaledCorners.bl.y - scaledCorners.tl.y);
    const heightRight = Math.hypot(scaledCorners.br.x - scaledCorners.tr.x, scaledCorners.br.y - scaledCorners.tr.y);

    const maxWidth = Math.max(widthTop, widthBot);
    const maxHeight = Math.max(heightLeft, heightRight);

    const targetWidth = 1000;
    const aspectRatio = maxHeight / maxWidth;
    const targetHeight = Math.round(targetWidth * aspectRatio);

    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, targetWidth, 0, targetWidth, targetHeight, 0, targetHeight]);
    const M = cv.getPerspectiveTransform(srcTri, dstTri);

    const warped = new cv.Mat();
    // src is grayscale
    cv.warpPerspective(src, warped, M, new cv.Size(targetWidth, targetHeight));

    // Capture Warped Image for Debugging (Base64)
    // Only capture if needed (performance cost) but for dataset gen we need it.
    // The previous implementation deleted warped immediately. We will keep it until return.
    const canvas = document.createElement('canvas'); // headless
    cv.imshow(canvas, warped);
    const warpedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    src.delete(); srcTri.delete(); dstTri.delete(); M.delete();

    try {
        let allAnswers: string[] = [];
        let allBubbles: DebugBubble[] = [];

        // --- ROUTING LOGIC ---
        // --- ROUTING LOGIC ---
        if (itemCount > 20 && itemCount <= 50) {
            // 2 COLUMNS (Handles 30, 40, 50 items)
            // Split evenly or near-evenly
            const colWidth = Math.floor(warped.cols / 2);
            const itemsLeft = Math.ceil(itemCount / 2); // e.g., 25 for 50, 20 for 40
            const itemsRight = itemCount - itemsLeft;   // e.g., 25 for 50, 20 for 40

            // Col 1
            const c1Mat = warped.roi(new cv.Rect(0, 0, colWidth, warped.rows));
            const c1 = await processSingleColumnImage(cv, c1Mat, itemsLeft, { minY: 100, maxY: warped.rows - 50 }, "Left", 0, { x: 0, y: 0 }, manualOffset);
            c1Mat.delete();

            // Col 2
            // OVERLAP STRATEGY: Start slightly before the middle to ensure anchors aren't cut
            const overlap = 50;
            const startX2 = colWidth - overlap;
            const c2Mat = warped.roi(new cv.Rect(startX2, 0, warped.cols - startX2, warped.rows));
            // Offset logic: x starts at startX2
            const c2 = await processSingleColumnImage(cv, c2Mat, itemsRight, { minY: 100, maxY: warped.rows - 50 }, "Right", itemsLeft, { x: startX2, y: 0 }, manualOffset);
            c2Mat.delete();

            allAnswers = [...c1.answers, ...c2.answers].slice(0, itemCount);
            allBubbles = [...c1.bubbles, ...c2.bubbles];

            // Flatten Anchors
            const allAnchors = [...(c1.anchors || []), ...(c2.anchors || [])];

            return { answers: allAnswers, confidence: 1.0, debugData: { bubbles: allBubbles, anchors: allAnchors, warpedImage: warpedDataUrl } as any };

        } else if (itemCount > 50) {
            // 3 COLUMNS (Assume 20 + 20 + Remainder)
            const colWidth = Math.floor(warped.cols / 3);

            // Col 1
            const c1Mat = warped.roi(new cv.Rect(0, 0, colWidth, warped.rows));
            const c1 = await processSingleColumnImage(cv, c1Mat, 20, { minY: 100, maxY: warped.rows - 50 }, "Col1", 0, { x: 0, y: 0 }, manualOffset);
            c1Mat.delete();

            // Col 2 (Overlap Left)
            const overlap = 40;
            const startX2 = colWidth - overlap;
            const c2Mat = warped.roi(new cv.Rect(startX2, 0, colWidth + overlap, warped.rows));
            const c2 = await processSingleColumnImage(cv, c2Mat, 20, { minY: 100, maxY: warped.rows - 50 }, "Col2", 20, { x: startX2, y: 0 }, manualOffset);
            c2Mat.delete();

            // Col 3 (Overlap Left)
            const startX3 = (colWidth * 2) - overlap;
            const c3Mat = warped.roi(new cv.Rect(startX3, 0, warped.cols - startX3, warped.rows));
            const remainder = itemCount - 40;
            const c3 = await processSingleColumnImage(cv, c3Mat, remainder, { minY: 100, maxY: warped.rows - 50 }, "Col3", 40, { x: startX3, y: 0 }, manualOffset);
            c3Mat.delete();

            allAnswers = [...c1.answers, ...c2.answers, ...c3.answers].slice(0, itemCount);
            allBubbles = [...c1.bubbles, ...c2.bubbles, ...c3.bubbles];
            const allAnchors = [...(c1.anchors || []), ...(c2.anchors || []), ...(c3.anchors || [])];

            return { answers: allAnswers, confidence: 1.0, debugData: { bubbles: allBubbles, anchors: allAnchors, warpedImage: warpedDataUrl } as any };

        } else {
            // SINGLE COLUMN
            const res = await processSingleColumnImage(cv, warped, itemCount, { minY: 100, maxY: warped.rows - 50 }, "Single", 1, { x: 0, y: 0 }, manualOffset);
            allAnswers = res.answers.slice(0, itemCount);
            allBubbles = res.bubbles;
            return { answers: allAnswers, confidence: 1.0, debugData: { bubbles: allBubbles, anchors: res.anchors, warpedImage: warpedDataUrl } as any };
        }
    } catch (e) {
        console.error("Grading Error:", e);
        if (!warped.isDeleted()) warped.delete();
        return { answers: [], confidence: 0 };
    }
};

// 3. MAIN (Backward Compat)
export const gradeAnswerSheet = async (
    imageSource: HTMLImageElement | HTMLCanvasElement | string,
    totalItems: number,
    sourceType: OMRSourceType = 'upload',
    manualOffset: { x: number, y: number } = { x: 0, y: 0 } // NEW
): Promise<{ answers: string[], confidence: number, debugData?: any }> => {
    try {
        const corners = await detectPageCorners(imageSource, sourceType);
        console.log("Corners Detected:", corners);
        return await gradeFromCorners(imageSource, corners, totalItems, sourceType, manualOffset);
    } catch (e) {
        console.error("Auto-grade failed:", e);
        return { answers: [], confidence: 0 };
    }
};
