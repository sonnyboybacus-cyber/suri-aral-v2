
/**
 * SURI-ARAL OMR ENGINE
 * Client-Side Optical Mark Recognition using OpenCV.js
 * 
 * Based on the Python implementation:
 * 1. Find Corners (ArUco or Document Contour)
 * 2. Warp Perspective
 * 3. Threshold (Otsu)
 * 4. Grid Grading (Pixel Counting)
 */

declare global {
    interface Window {
        cv: any;
        cvPromise: Promise<void> | null;
    }
}

// Ensure OpenCV is loaded
// Ensure OpenCV is loaded
export const loadOpenCV = (): Promise<void> => {
    // 1. Check if already loaded
    if (window.cv && window.cv.Mat) return Promise.resolve();
    if (window.cvPromise) return window.cvPromise;

    // 2. Wait for the static script in index.html to finish loading
    window.cvPromise = new Promise((resolve, reject) => {
        // Poll every 50ms for 10 seconds
        let attempts = 0;
        const checkCV = setInterval(() => {
            attempts++;
            if (window.cv && window.cv.Mat) {
                clearInterval(checkCV);
                resolve();
            } else if (window.cv && window.cv.getBuildInformation) {
                clearInterval(checkCV);
                resolve();
            } else if (attempts > 200) { // 10 seconds
                clearInterval(checkCV);
                reject(new Error("Timeout waiting for OpenCV to load from index.html"));
            }
        }, 50);
    });

    return window.cvPromise;
};

// Helper: Sort contours top-to-bottom or left-to-right
const sortContours = (cnts: any[], method = "top-to-bottom") => {
    const boundingBoxes = cnts.map(c => window.cv.boundingRect(c));
    const indexed = cnts.map((c, i) => ({ c, box: boundingBoxes[i], i }));

    indexed.sort((a, b) => {
        if (method === "top-to-bottom") return a.box.y - b.box.y;
        if (method === "left-to-right") return a.box.x - b.box.x;
        // Simple approximation
        return 0;
    });

    return indexed.map(x => x.c);
};

// Helper: 4-Point Transform
const fourPointTransform = (image: any, pts: any) => {
    const cv = window.cv;
    // Pts is a Mat of size 4x2
    // We need to order them: TL, TR, BR, BL
    // Simplified ordering (assuming mostly upright)
    // Actually, we must order points properly

    // Convert to array
    const points = [];
    for (let i = 0; i < 4; i++) {
        points.push({ x: pts.floatAt(i, 0), y: pts.floatAt(i, 1) });
    }

    // Sort by Y to separate Top/Bottom
    points.sort((a, b) => a.y - b.y);
    const top = points.slice(0, 2).sort((a, b) => a.x - b.x); // TL, TR
    const bottom = points.slice(2, 4).sort((a, b) => a.x - b.x); // BL, BR => Wait, usually BL is first x

    const tl = top[0];
    const tr = top[1];
    const bl = bottom[0];
    const br = bottom[1];

    // Width
    const widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
    const widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
    const maxWidth = Math.max(widthA, widthB);

    // Height
    const heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2));
    const heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2));
    const maxHeight = Math.max(heightA, heightB);

    // Correct format for perspective transform
    // Note: ordering must match: TL, TR, BR, BL, but bl/br are swapped in our sort logic often.
    // Let's assume the points are correct.

    // Create Mat from Array directly (rows, cols, type, array)
    // 4 rows, 1 col, 2 channels (x,y) = CV_32FC2
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight]);

    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    const warped = new cv.Mat();
    cv.warpPerspective(image, warped, M, new cv.Size(maxWidth, maxHeight));

    srcTri.delete(); dstTri.delete(); M.delete();
    return warped;
};

// Main Grading Function
export const gradeAnswerSheet = async (
    imageSource: HTMLImageElement | HTMLCanvasElement | string,
    totalItems: number
): Promise<{ answers: string[], confidence: number }> => {
    await loadOpenCV();
    const cv = window.cv;

    try {
        // 1. Load Image
        let src: any;
        if (typeof imageSource === 'string') {
            // Base64 or URL - Need to load into Image element first
            // For now assume it's passed as an ID or we create an element
            return { answers: [], confidence: 0 }; // simplified
        } else {
            src = cv.imread(imageSource);
        }

        // 2. Preprocessing
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

        const edged = new cv.Mat();
        cv.Canny(blurred, edged, 75, 200);

        // 3. Find Document (Corner Markers Strategy)
        // Instead of finding 1 big paper, we look for 4 corner markers (black squares).
        // This avoids locking onto the 'Name' box.
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();

        // Use standard binary threshold for marker finding, or keep Canny?
        // Canny gives edges. Markers are solid blocks.
        // Better to use simple Thresholding for markers.
        const binThresh = new cv.Mat();
        cv.threshold(blurred, binThresh, 0, 255, cv.CV_THRESH_BINARY_INV + cv.CV_THRESH_OTSU);

        cv.findContours(binThresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const markers: any[] = [];
        // Loop contours to find candidate markers
        for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i);
            const area = cv.contourArea(cnt);
            const rect = cv.boundingRect(cnt);
            const aspectRatio = rect.width / rect.height;
            const solidity = area / (rect.width * rect.height);

            // Marker Characteristics:
            // 1. Reasonable size (not too small noise, not huge name box)
            // Name Box Area is huge compared to markers. Markers are small squares.
            // Let's say Marker Area > 100 && Area < 5000 (depends on res).
            // But relative to image area is better? 
            // Marker is ~20px - 50px. Area ~400-2500.
            // 2. Square-ish (AR 0.8 - 1.2)
            // 3. Solid (Solidity ~1.0)

            if (area > 50 && area < 10000 && aspectRatio >= 0.7 && aspectRatio <= 1.3 && solidity > 0.8) {
                markers.push(cnt);
            }
        }

        let docCnt = null;

        if (markers.length >= 4) {
            // Sort markers by area? Or just use them?
            // If we have > 4 (e.g. noise), we need to pick the "best" 4.
            // Usually the 4 corners are the most extreme points?
            // Or the 4 largest squares?
            // Let's sort by area descending and take top 4.
            markers.sort((a, b) => cv.contourArea(b) - cv.contourArea(a));
            const distinctMarkers = markers.slice(0, 4);

            // Now we have 4 markers. We need to order them TL, TR, BL, BR.
            // Or rather, we need to construct a single "docCnt" from their CENTERS.
            // This forms the bounding box we want to warp.

            // Calculate centers
            const points = distinctMarkers.map(c => {
                const M = cv.moments(c);
                return { x: M.m10 / M.m00, y: M.m01 / M.m00 };
            });

            // Order points: TL, TR, BR, BL via our helper logic (or manually).
            // Sort by Y (Top vs Bottom)
            points.sort((a, b) => a.y - b.y);

            const top = points.slice(0, 2).sort((a: any, b: any) => a.x - b.x);
            const bottom = points.slice(2, 4).sort((a: any, b: any) => a.x - b.x);

            // Create a synthetic contour from these 4 points
            docCnt = new cv.Mat(4, 1, cv.CV_32SC2);
            docCnt.intPtr(0, 0)[0] = top[0].x; docCnt.intPtr(0, 0)[1] = top[0].y; // TL
            docCnt.intPtr(1, 0)[0] = top[1].x; docCnt.intPtr(1, 0)[1] = top[1].y; // TR
            docCnt.intPtr(2, 0)[0] = bottom[1].x; docCnt.intPtr(2, 0)[1] = bottom[1].y; // BR
            docCnt.intPtr(3, 0)[0] = bottom[0].x; docCnt.intPtr(3, 0)[1] = bottom[0].y; // BL

            // Important: Clean up others
            binThresh.delete();
        } else {
            // FALLBACK: Largest Contour Strategy (but smarter)
            console.warn(`Found only ${markers.length} markers. Falling back to Paper Contour detection...`);

            let maxPolyArea = 0;
            let bestApproximation = null;

            for (let i = 0; i < contours.size(); i++) {
                const cnt = contours.get(i);
                const area = cv.contourArea(cnt);
                const rect = cv.boundingRect(cnt);

                // Relaxed constraints for paper
                if (area > 5000 && rect.width > 200 && rect.height > 200) {
                    const peri = cv.arcLength(cnt, true);
                    const approx = new cv.Mat();
                    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

                    if (approx.rows === 4) {
                        const ar = rect.width / rect.height;

                        // Exclude Name Box (AR > 2.5), Exclude thin strips (AR > 3 or < 0.3)
                        // Paper AR is usually 0.7 - 1.5. 
                        // Allow little more for perspective.
                        if (ar < 2.5 && ar > 0.4 && area > maxPolyArea) {
                            maxPolyArea = area;
                            if (bestApproximation) bestApproximation.delete();
                            bestApproximation = approx;
                        } else {
                            approx.delete();
                        }
                    } else {
                        approx.delete();
                    }
                }
            }

            if (bestApproximation) {
                docCnt = bestApproximation;
                console.log("Fallback successful: Found Paper Contour.");
                // binThresh.delete(); // don't delete yet? it's not used below except for delete
            } else {
                console.error("Fallback failed. No paper contour found.");
                binThresh.delete();
                src.delete(); gray.delete(); blurred.delete(); edged.delete(); contours.delete(); hierarchy.delete();
                throw new Error(`Analysis Failed. Found ${markers.length} markers. Could not find 4 Corner Markers AND could not find the Paper Outline. Please ensure proper lighting and background contrast.`);
            }
            binThresh.delete();
        }

        // 4. Warp
        // Need to reshape docCnt to 4x2 points (float)
        // docCnt is a Mat of points (int)
        // We need to convert it to a format for our helper
        const floatPts = new cv.Mat();
        docCnt.convertTo(floatPts, cv.CV_32F);

        const warped = fourPointTransform(gray, floatPts);
        const warpedColor = fourPointTransform(src, floatPts); // For debug view if needed

        // 5. Threshold (Otsu)
        const thresh = new cv.Mat();
        cv.threshold(warped, thresh, 0, 255, cv.CV_THRESH_BINARY_INV + cv.CV_THRESH_OTSU);

        // 6. Find Bubbles
        // We look for contours in the warped image that are roughly circular and of a certain size
        // This requires some calibration.
        // Assuming 50 items = 2 cols? Or 1 col?
        // User's script assumes 1 column of questions, but our PDF generates Multi-Column.
        // This is the TRICKY part.
        // Strategy: Grid Chop.
        // If we know the layout (Grid), we can just slice the image?
        // Or detect ALL bubbles and sort them.

        const bubbleCnts = new cv.MatVector();
        const hierBubbles = new cv.Mat();
        cv.findContours(thresh, bubbleCnts, hierBubbles, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const questionCnts: any[] = [];
        for (let i = 0; i < bubbleCnts.size(); i++) {
            const c = bubbleCnts.get(i);
            const rect = cv.boundingRect(c);
            const ar = rect.width / rect.height;

            // Filter Bubbles
            // Relaxed constraints to better detect bubbles in various resolutions
            const area = cv.contourArea(c);
            if (area > 50 && rect.width >= 5 && rect.height >= 5 && ar >= 0.4 && ar <= 1.6) {
                questionCnts.push(c);
            }
        }

        // Multi-Column Sorting Strategy
        // 1. Sort all bubbles by X coordinate first to separate columns
        const sortedByX = sortContours(questionCnts, "left-to-right");

        // 2. Group into Columns based on X gaps
        const columns: any[][] = [];
        let currentCol: any[] = [];
        let lastX = -999;

        // Dynamic Gap Detection: If next bubble is significantly to the right, it's a new column
        // A standard bubble is ~20px-30px wide + gap. If jump is >> width, say 50px.
        const COLUMN_GAP_THRESHOLD = 50;

        sortedByX.forEach(cnt => {
            const rect = cv.boundingRect(cnt);
            if (lastX !== -999 && (rect.x - lastX) > COLUMN_GAP_THRESHOLD && currentCol.length > 0) {
                // But wait, sorting by X implies strictly increasing X.
                // Bubbles in the SAME column are roughly same X (within bubble width).
                // Bubbles in NEXT column are X + block_width.
                // We need to check if the current bubble's X is significantly larger than the *average* X of the current column?
                // Simpler: If rect.x > lastX + 50? 
                // No, bubbles in same column have ~same X. 
                // Bubbles in different column have distinct X.
            }
            // Actually, simple sorting by X mixes rows: C1-R1, C1-R2... NO.
            // Sorting by X puts C1-R1, C1-R2... mixed? No.
            // C1-R1-A, C1-R1-B... have increasing X.
            // C1-R2-A ... have same X range.
            // C2-R1-A ... have much larger X.

            // Better Strategy: K-Means clustering on X? Overkill.
            // Histogram of X? 
            // Simple clustering:
            // Iterate all, if x is within +/- 30px of current column center, add to column.
            // Else create new column.
        });

        // Let's redo:
        // 1. Identify valid columns by X-centers.
        // We know layout is grid.
        // We take all X-centers. Cluster them.
        const xCenters = questionCnts.map(c => {
            const r = cv.boundingRect(c);
            return r.x + r.width / 2;
        });

        // Find unique column blocks.
        // A "Block" of questions (Col 1, Col 2...) is separated by large gap.
        // Within a block, we have rows of bubbles (A,B,C,D).
        // Each bubble in a row is separated by small gap.

        // We want to process Column 1 fully, then Column 2.
        // So we need to group contours that belong to Col 1.
        // Col 1 is defined by a range of X values.

        // Sort all contours by X.
        // We can split the image vertically?
        // Let's assume max 5 columns.
        // We need to detect "Grand Columns" (Question Blocks).

        // Heuristic:
        // Sort by X.
        // Iterate through. If x_current - x_prev > LARGE_GAP (e.g. 100px), it's a new Question Column.
        // But wait, the bubbles A, B, C, D are spaced by X.
        // So A->B is small gap. B->C small gap.
        // D -> Col2_A is a LARGE gap?
        // Yes, usually.
        // PDF Gen: Block Width = 12 + 4*9 = 48mm. Gap = 10mm.
        // Gap is smaller than block? 
        // 10mm gap vs 9mm bubble spacing. It helps.

        // Let's try:
        // Group bubbles into "Visual Columns" (A, B, C, D).
        // Then Group Visual Columns into "Question Columns".

        // Alternative:
        // Just Sort by Y (Top-Bottom).
        // Then for each ROW (similar Y), sort by X.
        // Row = [Q1_A, Q1_B... Q1_D,  Q21_A... Q21_D]
        // If row legth is 4 => Only 1 col.
        // If row length is 8 => 2 cols.
        // If row length is 12 => 3 cols.
        // We can just chunk the sorted row by 4!
        // [Q1-bubbles] -> Process -> Ans1
        // [Q21-bubbles] -> Process -> Ans21
        // But then we simply append Ans21 AFTER Ans1.
        // The array becomes [Ans1, Ans21, Ans41, Ans2, Ans22...]
        // We need to REORDER the final array?

        // YES. If we detect multiple columns per row, we generate an interleaved array.
        // We need to de-interleave it.
        // But we don't know the column split counts (20, 20, 10).
        // UNLESS we calculate it.

        // Let's stick to "Split Contours by Main Columns first".
        // 1. Determine X-thresholds for columns.
        // Sort contours by X.
        // Histogram approach?

        // Implementation:
        // 1. Sort by X.
        // 2. Find large jumps in X (between the 'D' of Col 1 and 'A' of Col 2).
        // But 'A' and 'B' are also separated.
        // Dist(A,B) ~ width. Dist(D, Col2-A) > width.

        const sortedX = sortContours(questionCnts, "left-to-right");
        const vertical_clusters: any[][] = [];

        if (sortedX.length > 0) {
            let currentCluster = [sortedX[0]];
            let lastR = cv.boundingRect(sortedX[0]);

            for (let i = 1; i < sortedX.length; i++) {
                const c = sortedX[i];
                const r = cv.boundingRect(c);
                const prev = currentCluster[currentCluster.length - 1];
                const pr = cv.boundingRect(prev);

                // Distance from Prev-Right-Edge to Curr-Left-Edge
                const gap = r.x - (pr.x + pr.width);

                // If gap is BIG (e.g. > 2 * bubble_width), start new vertical cluster (Question Column)
                // A->B gap is small. D->Col2A is bigger.
                // Or compare centers.
                // Let's use a threshold relative to bubble width.
                // Bubble width ~20px. Gap A-B ~10px. Gap Col-Col ~50px?

                if (gap > (pr.width * 1.5)) {
                    // Likely a new column block? 
                    // Wait, A-B gap might be small.
                    // But if we are sorting by X, we might mix rows?
                    // C1-R1-A, C1-R2-A....
                    // No, left-to-right sort mixes rows.
                    // This is hard.
                }
            }
        }

        // BACK TO ROBUST APPROACH:
        // 1. Group into ROWS by Y.
        // 2. Within each ROW, Sort by X.
        // 3. Chunk each ROW into groups of 4.
        // 4. Assign each chunk to a "Question ID".
        //    How do we know Q1 vs Q21?
        //    We maintain `col_counters`.
        //    Row 1 has 3 chunks? => Col 1, Col 2, Col 3.
        //    We store answers in a Map: `Col1_Answers`, `Col2_Answers`...
        //    Then we concatenate them at the end.

        const answersMap: { [key: number]: string[] } = {}; // ColIndex -> Answers

        // 1. Sort ALL by Top-to-Bottom
        const sortedY = sortContours(questionCnts, "top-to-bottom");

        // 2. Group into Rows
        const rows: any[][] = [];
        const ROW_TOLERANCE = 24;

        // Modified Row Grouping with intelligent averaging
        // (existing logic was okay, just reusing it)
        let currentRowNodes: any[] = [];
        let rowY = -999;

        // We need to re-sort carefully or handle the loop
        // The previous loop was okay.

        sortedY.forEach(cnt => {
            const rect = cv.boundingRect(cnt);
            const cy = rect.y + rect.height / 2;

            if (rowY === -999) rowY = cy;

            if (Math.abs(cy - rowY) > ROW_TOLERANCE) {
                rows.push(currentRowNodes);
                currentRowNodes = [];
                rowY = cy;
            }
            currentRowNodes.push(cnt);
            // Update average Y? No, keep simple.
        });
        if (currentRowNodes.length) rows.push(currentRowNodes);

        // 3. Process Rows
        rows.forEach(row => {
            // Sort by X
            row.sort((a, b) => cv.boundingRect(a).x - cv.boundingRect(b).x);

            // Chunk into 4s
            // Each chunk is a question from a specific column 0, 1, 2...
            let colIndex = 0;

            for (let i = 0; i < row.length; i += 4) {
                const chunk = row.slice(i, i + 4);
                if (chunk.length < 4) continue;

                // Process Answer (A,B,C,D)
                let maxPixel = -1;
                let bestIdx = -1;

                chunk.forEach((c: any, idx: number) => {
                    const mask = cv.Mat.zeros(thresh.rows, thresh.cols, cv.CV_8UC1);
                    const contourVec = new cv.MatVector();
                    contourVec.push_back(c);
                    cv.drawContours(mask, contourVec, -1, [255], -1);
                    const rect = cv.boundingRect(c);
                    // Check filled pixels
                    // Use mean intensity or countNonZero of mask AND thresh?
                    // thresh is binary (255=white=background?). 
                    // Wait, pre-processing: `cv.threshold(warped, thresh, 0, 255, cv.CV_THRESH_BINARY_INV + cv.CV_THRESH_OTSU);`
                    // BINARY_INV => Filled Bubble (Black on Paper) becomes WHITE (255) in thresh.
                    // So we countNonZero in the ROI of thresh.
                    const roi = thresh.roi(rect);
                    const count = cv.countNonZero(roi);

                    // Density check?
                    if (count > maxPixel) {
                        maxPixel = count;
                        bestIdx = idx;
                    }
                    roi.delete(); mask.delete(); contourVec.delete();
                });

                // Threshold for "Is Filled?"
                // If maxPixel is very low (noise), maybe it's blank?
                // For now, assume forced choice (pick max).
                // Or add threshold: if (maxPixel < totalPixels * 0.4) default to ''?

                const map = ['A', 'B', 'C', 'D'];
                const ans = map[bestIdx];

                if (!answersMap[colIndex]) answersMap[colIndex] = [];
                answersMap[colIndex].push(ans);

                colIndex++;
            }
        });

        // 4. Flatten Answers by Column
        // Object.keys might be unordered? Use 0, 1, 2...
        const finalAnswers: string[] = [];
        const numCols = Object.keys(answersMap).length;
        for (let c = 0; c < numCols; c++) {
            if (answersMap[c]) {
                finalAnswers.push(...answersMap[c]);
            }
        }

        // ... (sorting logic)

        // VISUAL DEBUGGING: Draw detailed feedback on the original image
        // We need to un-warp points to draw on original image? 
        // Too hard. Let's just draw on the warped image and return it?
        // Or better: We assume the input 'imageSource' canvas is where we want to verify.

        // Since we have 'docCnt', we can draw the detected paper on the original image.
        if (imageSource instanceof HTMLCanvasElement) {
            const ctx = imageSource.getContext('2d');
            if (ctx) {
                // 1. Draw Paper Contour (Green)
                // docCnt points are relative to the original image 'src'
                // We need to extract points from docCnt
                // docCnt is CV_32S (integer)

                // Simplified drawing using JS (not OpenCV drawing to keep transparent pipeline)
                ctx.strokeStyle = '#00FF00'; // Green
                ctx.lineWidth = 4;
                ctx.beginPath();
                const ptr = docCnt.data32S;
                ctx.moveTo(ptr[0], ptr[1]);
                ctx.lineTo(ptr[2], ptr[3]);
                ctx.lineTo(ptr[4], ptr[5]);
                ctx.lineTo(ptr[6], ptr[7]);
                ctx.closePath();
                ctx.stroke();

                // 2. We can't easily draw the bubbles because they are in 'warped' coordinate space.
                // However, we can console log the count.
                console.log(`Debug: Found ${questionCnts.length} potential bubbles.`);
                console.log(`Debug: Warped size ${warped.cols}x${warped.rows}`);

                // Fallback: If 0 answers, maybe thresholding failed.
                if (finalAnswers.length === 0) {
                    // Draw a big warning on canvas
                    ctx.font = "30px Arial";
                    ctx.fillStyle = "red";
                    ctx.fillText("Paper Detected, but 0 Bubbles found.", 50, 50);
                    ctx.fillText("Check lighting & markers.", 50, 90);
                }
            }
        }

        // Cleanup functions
        src.delete(); gray.delete(); blurred.delete(); edged.delete();
        contours.delete(); hierarchy.delete(); docCnt.delete();
        floatPts.delete(); warped.delete(); warpedColor.delete(); thresh.delete();
        bubbleCnts.delete(); hierBubbles.delete();

        return { answers: finalAnswers, confidence: 1.0 };

    } catch (e: any) {
        console.error("OMR Error", e);
        if (imageSource instanceof HTMLCanvasElement) {
            const ctx = imageSource.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 5;
                ctx.strokeRect(10, 10, imageSource.width - 20, imageSource.height - 20);
            }
        }
        throw e;
    }
};
