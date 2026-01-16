import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CameraIcon, UploadIcon, XIcon, SpinnerIcon, CheckCircleIcon, AlertTriangleIcon, HelpIcon, DownloadIcon, ZapIcon, ArrowUpIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, SettingsIcon, SparklesIcon } from '../icons';
import { gradeAnswerSheet, OMR_ITEM_OPTIONS } from '../../services/omrEngine';
import { ScanInstructions } from './ScanInstructions';

interface OMRScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScanComplete: (answers: string[]) => void;
    totalItems: number;
    initialImage?: string | null;
}


export const OMRScanner: React.FC<OMRScannerProps> = ({ isOpen, onClose, onScanComplete, totalItems, initialImage }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string[] | null>(null);
    const [selectedItemCount, setSelectedItemCount] = useState(totalItems || 50);
    const [showHelp, setShowHelp] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [currentSourceType, setCurrentSourceType] = useState<'camera' | 'upload'>('upload');

    // TORCH STATE
    const [torchAvailable, setTorchAvailable] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);

    // CALIBRATION STATE
    const [calibrationImage, setCalibrationImage] = useState<string | null>(null);
    const [cornerPoints, setCornerPoints] = useState<{ tl: any, tr: any, bl: any, br: any } | null>(null);
    const [originalImageDims, setOriginalImageDims] = useState<{ w: number, h: number } | null>(null);

    // DATASET EXPORT STATE
    const [latestDebugData, setLatestDebugData] = useState<any>(null);

    // MANUAL OFFSET STATE (Nudge)
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [lastScannedImage, setLastScannedImage] = useState<string | null>(null);

    const handleNudge = async (dx: number, dy: number) => {
        if (!lastScannedImage) return;

        const newOffset = { x: offset.x + dx, y: offset.y + dy };
        setOffset(newOffset);

        setIsProcessing(true);
        try {
            const gradingResult = await gradeAnswerSheet(
                lastScannedImage,
                selectedItemCount,
                currentSourceType,
                newOffset
            );

            if (gradingResult.answers.length > 0) {
                setResult(gradingResult.answers);
                setLatestDebugData(gradingResult.debugData);
            }
        } catch (e) {
            console.error("Nudge Error:", e);
        }
        setIsProcessing(false);
    };

    // Update isMobile on resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // MOUNT CHECK
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // HANDLE INITIAL IMAGE (From External Upload)
    useEffect(() => {
        if (isOpen && initialImage) {
            loadInitialImage(initialImage);
        }
    }, [isOpen, initialImage]);

    const loadInitialImage = async (src: string, type: 'camera' | 'upload' = 'upload') => {
        setIsProcessing(true);
        setCurrentSourceType(type);
        setLastScannedImage(src); // Save for Re-grading (Nudge)
        setOffset({ x: 0, y: 0 }); // Reset Offset
        setError(null);
        stopCamera();

        const img = new Image();
        img.onload = async () => {
            try {
                const { detectPageCorners, gradeFromCorners } = await import('../../services/omrEngine');
                const corners = await detectPageCorners(img, type);

                // AUTO-GRADE LOGIC (Bypassing Calibration)
                const gradingResult = await gradeFromCorners(src, corners, selectedItemCount, type);

                if (gradingResult.answers.length > 0) {
                    setResult(gradingResult.answers);
                    setLatestDebugData(gradingResult.debugData);
                } else {
                    setError("No answers detected. Please verify the image.");
                }

                // We no longer set calibrationImage, so the UI doesn't switch.
                // We keep originalDims just in case we need them later, but strictly speaking redundant now.
                setOriginalImageDims({ w: img.width, h: img.height });

            } catch (err: any) {
                console.error(err);
                setError("Failed to process answer sheet. Please ensure all 4 corners are visible.");
            } finally {
                setIsProcessing(false);
            }
        };
        img.onerror = () => {
            setError("Failed to load uploaded image.");
            setIsProcessing(false);
        };
        img.src = src;
    };

    const handleExportDataset = async () => {
        if (!latestDebugData || !latestDebugData.warpedImage) return;
        setIsProcessing(true);
        try {
            const JSZip = (await import('jszip')).default;
            const { saveAs } = await import('file-saver');

            const zip = new JSZip();
            const markedFolder = zip.folder("marked");
            const emptyFolder = zip.folder("empty");

            // Load Warped Image to Canvas
            const img = new Image();
            img.src = latestDebugData.warpedImage;
            await new Promise((resolve) => { img.onload = resolve; });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0);

            let count = 0;
            for (const b of latestDebugData.bubbles) {
                // Determine Folder based on Heuristic Fill (Tier 1)
                // This gives the user a "Good Start" to manually verify later
                const isLikelyMarked = b.fill > 0.25;

                // Crop
                // Use colOffset if present (from overlapping/3-col logic)
                const globalX = b.x;
                const globalY = b.y;

                // Safety check
                if (globalX < 0 || globalY < 0 || globalX + b.w > img.width || globalY + b.h > img.height) continue;

                const bubbleData = ctx.getImageData(globalX, globalY, b.w, b.h);
                const bubbleCanvas = document.createElement('canvas');
                bubbleCanvas.width = b.w;
                bubbleCanvas.height = b.h;
                const bCtx = bubbleCanvas.getContext('2d');
                bCtx?.putImageData(bubbleData, 0, 0);

                // Convert to Blob
                const blob = await new Promise<Blob | null>(resolve => bubbleCanvas.toBlob(resolve, 'image/png'));
                if (blob) {
                    const filename = `item${b.itemIndex}_${b.label}_${Math.round(b.fill * 100)}p.png`;
                    if (isLikelyMarked) {
                        markedFolder?.file(filename, blob);
                    } else {
                        emptyFolder?.file(filename, blob);
                    }
                    count++;
                }
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `omr-dataset-${Date.now()}.zip`);
            alert(`Exported ${count} bubbles! Unzip and verify them for training.`);

        } catch (e) {
            console.error("Export failed:", e);
            alert("Failed to export dataset.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Start Camera on Mount (If no initial image)
    useEffect(() => {
        if (isOpen && !initialImage && !calibrationImage) { // Only start camera if not calibrating
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, calibrationImage, initialImage]);

    const startCamera = async () => {
        setIsCameraActive(true);
        setError(null);
        setResult(null);
        setTorchAvailable(false);
        setIsTorchOn(false);

        try {
            // CONSTRAINTS: Simple setup - let browser handle orientation naturally
            const constraints = isMobile
                ? {
                    video: {
                        facingMode: "environment",
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        advanced: [{ focusMode: "continuous" }] as any
                    }
                }
                : {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        advanced: [{ focusMode: "continuous" }] as any
                    }
                };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            // Check Torch Capability
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            if ((capabilities as any).torch) {
                setTorchAvailable(true);
            }

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error(err);
            setError("Could not access camera. Please allow camera permissions or try uploading a file.");
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const toggleTorch = async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        try {
            await track.applyConstraints({
                advanced: [{ torch: !isTorchOn } as any]
            });
            setIsTorchOn(!isTorchOn);
        } catch (e) {
            console.error("Torch toggle failed:", e);
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current || isProcessing) return;

        setIsProcessing(true);
        setError(null);

        // Draw to canvas (with Portrait orientation correction)
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Simple capture - let browser handle orientation
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // CONVERT TO IMAGE & ENTER CALIBRATION MODE
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        await loadInitialImage(dataUrl, 'camera');
        // loadInitialImage handles the corner detection and state updates
    };

    // GRADE AFTER CALIBRATION
    const handleCalibrationConfirm = async () => {
        if (!calibrationImage || !cornerPoints) return;
        setIsProcessing(true);
        try {
            const { gradeFromCorners } = await import('../../services/omrEngine');
            const gradingResult = await gradeFromCorners(calibrationImage, cornerPoints, selectedItemCount, currentSourceType);
            setResult(gradingResult.answers);
            setLatestDebugData(gradingResult.debugData); // Save Debug Data
            setCalibrationImage(null); // Exit calibration
        } catch (err: any) {
            console.error(err);
            setError("Grading failed after calibration.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = () => {
        if (result) {
            onScanComplete(result);
            onClose();
        }
    };

    // DRAG LOGIC FOR CORNERS
    const draggingCorner = useRef<string | null>(null);
    const handlePointerDown = (corner: string, e: React.PointerEvent) => {
        draggingCorner.current = corner;
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingCorner.current || !cornerPoints || !originalImageDims) return;

        // Calculate relative position based on the displayed image size
        // We need the bounding rect of the container to map pointer to image coordinates
        const container = e.currentTarget.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        // Pointer X/Y relative to image container
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Map back to ORIGINAL image coordinates
        // Displayed size vs Original Size
        const scaleX = originalImageDims.w / rect.width;
        const scaleY = originalImageDims.h / rect.height;

        const newX = Math.max(0, Math.min(originalImageDims.w, x * scaleX));
        const newY = Math.max(0, Math.min(originalImageDims.h, y * scaleY));

        setCornerPoints((prev: any) => ({
            ...prev,
            [draggingCorner.current!]: { x: newX, y: newY }
        }));
    };
    const handlePointerUp = (e: React.PointerEvent) => {
        draggingCorner.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    // Download Debug Image
    const handleDownloadDebug = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const link = document.createElement('a');
            link.download = `omr-debug-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-95 flex flex-col animate-fade-in h-[100dvh] w-screen overflow-hidden">

            {/* Instructions Modal */}
            <ScanInstructions isOpen={showHelp} onClose={() => setShowHelp(false)} />

            {/* TOP BAR: Flash, Title, Debug, Close */}
            <div className="absolute top-0 w-full flex justify-between items-start pt-6 px-6 z-30 pointer-events-none bg-gradient-to-b from-black/80 to-transparent pb-12">

                {/* LEFT: Flash Toggle (Visible if available) */}
                <div className="pointer-events-auto min-w-[40px]">
                    {!calibrationImage && torchAvailable && (
                        <button
                            onClick={toggleTorch}
                            className={`p-3 rounded-full backdrop-blur-md transition-all ${isTorchOn ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-black/30 text-white border border-white/10'}`}
                        >
                            <ZapIcon className="w-6 h-6" />
                        </button>
                    )}
                    {calibrationImage && (
                        <button onClick={onClose} className="text-white text-sm bg-white/10 px-3 py-1 rounded backdrop-blur border border-white/20">
                            Cancel
                        </button>
                    )}
                </div>

                {/* CENTER: Title */}
                <div className="text-white text-center pt-2">
                    <h3 className="font-bold text-lg flex items-center justify-center gap-2 drop-shadow-md">
                        {calibrationImage ? "Adjust Corners" : "Camera Scan"}
                    </h3>
                    <div className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-xs text-gray-300 mt-1 border border-white/10 pointer-events-auto">
                        <span>Items:</span>
                        <select
                            value={selectedItemCount}
                            onChange={(e) => setSelectedItemCount(Number(e.target.value))}
                            className="bg-transparent text-white font-bold focus:ring-0 cursor-pointer p-0 border-none text-xs"
                            disabled={isProcessing}
                        >
                            {OMR_ITEM_OPTIONS.map((n: number) => (
                                <option key={n} value={n} className="text-gray-900">{n}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* RIGHT: Actions (Setting, Help, Close) */}
                <div className="flex items-center gap-3 pointer-events-auto min-w-[40px] justify-end">
                    <button
                        onClick={() => setShowHelp(true)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/5"
                    >
                        <HelpIcon className="w-5 h-5" />
                    </button>
                    <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/5">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>


            {/* Main Viewport - Added padding to prevent controls from covering the image */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group w-full pt-24 pb-32">

                {/* CALIBRATION OVERLAY */}
                {calibrationImage && cornerPoints && originalImageDims ? (
                    <div className="relative w-full h-full p-4 flex items-center justify-center touch-none">
                        <div className="relative max-w-full max-h-full aspect-[3/4] shadow-2xl">
                            <img
                                src={calibrationImage}
                                className="w-full h-full object-contain pointer-events-none select-none"
                                draggable={false}
                            />
                            {/* SVG OVERLAY FOR LINES */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <polygon
                                    points={`
                                        ${(cornerPoints.tl.x / originalImageDims.w) * 100},${(cornerPoints.tl.y / originalImageDims.h) * 100}
                                        ${(cornerPoints.tr.x / originalImageDims.w) * 100},${(cornerPoints.tr.y / originalImageDims.h) * 100}
                                        ${(cornerPoints.br.x / originalImageDims.w) * 100},${(cornerPoints.br.y / originalImageDims.h) * 100}
                                        ${(cornerPoints.bl.x / originalImageDims.w) * 100},${(cornerPoints.bl.y / originalImageDims.h) * 100}
                                    `}
                                    fill="rgba(99, 102, 241, 0.2)"
                                    stroke="#6366f1"
                                    strokeWidth="1"
                                />
                            </svg>

                            {/* DRAGGABLE HANDLES */}
                            {['tl', 'tr', 'bl', 'br'].map((corner) => {
                                const pt = (cornerPoints as any)[corner];
                                const left = (pt.x / originalImageDims.w) * 100;
                                const top = (pt.y / originalImageDims.h) * 100;
                                return (
                                    <div
                                        key={corner}
                                        className="absolute w-8 h-8 -ml-4 -mt-4 bg-indigo-500 rounded-full border-2 border-white shadow-lg z-20 cursor-move touch-none flex items-center justify-center"
                                        style={{ left: `${left}%`, top: `${top}%` }}
                                        onPointerDown={(e) => handlePointerDown(corner, e)}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                    >
                                        <div className="w-2 h-2 bg-white rounded-full pointer-events-none" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    // NORMAL CAMERA VIEW
                    <>
                        {/* PC HINT (Center) */}
                        {!isMobile && !result && !calibrationImage && (
                            <div className="absolute top-32 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur text-white/80 px-4 py-2 rounded-full text-xs font-medium border border-white/10 flex items-center gap-2 pointer-events-none">
                                <UploadIcon className="w-3 h-3" />
                                <span>For best results on PC, use upload</span>
                            </div>
                        )}

                        {!result && (
                            // Camera / Canvas Layer
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                {/* Hidden Canvas for Processing */}
                                <canvas ref={canvasRef} className="hidden" />

                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    onLoadedMetadata={() => videoRef.current?.play()}
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
                                />

                                {/* Camera Guide Overlay (Enforced Portrait 3:4 for A4) */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="aspect-[3/4] h-[85%] w-auto max-w-[90%] border-2 border-white/50 rounded-lg relative shadow-[0_0_0_100vmax_rgba(0,0,0,0.6)]">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-lg"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-lg"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-lg"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-lg"></div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70 text-sm font-medium bg-black/40 backdrop-blur px-3 py-1 rounded-full whitespace-nowrap">
                                            Align corners here
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* RESULT PREVIEW (Centered) */}
                {result && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-up">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Success!</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                    Captured {result.length} answers successfully.
                                </p>

                                {/* ANSWER PREVIEW GRID */}
                                <div className="max-h-[40vh] overflow-y-auto mb-4 p-1 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                    {/* VISUAL DEBUG OVERLAY (Shows Warped Image + ROIs) */}
                                    {latestDebugData && latestDebugData.warpedImage && (
                                        <div className="mb-4 relative rounded overflow-hidden border border-slate-200 dark:border-slate-700 select-none">
                                            {/* The Image */}
                                            <img
                                                src={latestDebugData.warpedImage}
                                                alt="Debug View"
                                                className="w-full h-auto opacity-50"
                                                onLoad={(e) => {
                                                    // HACK: Set the viewBox of the sibling SVG to match this image's natural size
                                                    const img = e.currentTarget;
                                                    const svg = img.nextElementSibling;
                                                    if (svg) {
                                                        svg.setAttribute("viewBox", `0 0 ${img.naturalWidth} ${img.naturalHeight}`);
                                                    }
                                                }}
                                            />
                                            {/* The SVG Overlay */}
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                                {latestDebugData.bubbles.map((b: any, idx: number) => (
                                                    <rect
                                                        key={idx}
                                                        x={b.x}
                                                        y={b.y}
                                                        width={b.w}
                                                        height={b.h}
                                                        fill={b.isMarked ? "rgba(34, 197, 94, 0.4)" : "none"} // Green if marked
                                                        stroke={b.isMarked ? "#16a34a" : "#f43f5e"} // Green vs Red stroke
                                                        strokeWidth="2"
                                                    />
                                                ))}
                                                {/* Draw ANCHORS (Blue Squares) if available */}
                                                {latestDebugData.anchors && latestDebugData.anchors.map((a: any, idx: number) => (
                                                    <rect
                                                        key={`a-${idx}`}
                                                        x={a.x - 2}
                                                        y={a.y - 2}
                                                        width={4}
                                                        height={4}
                                                        fill="#3b82f6" // Blue-500
                                                    />
                                                ))}
                                                {latestDebugData.bubbles.map((b: any, idx: number) => (
                                                    <text
                                                        key={`t-${idx}`}
                                                        x={b.x + b.w / 2}
                                                        y={b.y + b.h / 2}
                                                        textAnchor="middle"
                                                        alignmentBaseline="middle"
                                                        fill="black"
                                                        fontSize="10"
                                                        fontWeight="bold"
                                                    >
                                                        {b.label}
                                                    </text>
                                                ))}
                                            </svg>

                                            {/* MANUAL NUDGE CONTROLS (Overlay on top right) */}
                                            <div className="absolute top-2 right-2 flex flex-col items-center gap-1 bg-white/90 dark:bg-black/90 p-2 rounded-lg shadow-xl backdrop-blur border border-slate-200 pointer-events-auto z-10">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Align Grid</span>
                                                <button
                                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95"
                                                    onClick={() => handleNudge(0, -5)}
                                                >
                                                    <ArrowUpIcon className="w-4 h-4" />
                                                </button>
                                                <div className="flex gap-1">
                                                    <button
                                                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95"
                                                        onClick={() => handleNudge(-5, 0)}
                                                    >
                                                        <ArrowLeftIcon className="w-4 h-4" />
                                                    </button>
                                                    <div className="w-4 h-4" />
                                                    <button
                                                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95"
                                                        onClick={() => handleNudge(5, 0)}
                                                    >
                                                        <ArrowRightIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <button
                                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95"
                                                    onClick={() => handleNudge(0, 5)}
                                                >
                                                    <ArrowDownIcon className="w-4 h-4" />
                                                </button>
                                                <span className="text-[9px] font-mono text-slate-400 mt-1">
                                                    {offset.x},{offset.y}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-5 gap-1.5 p-1">
                                        {result.map((ans, idx) => (
                                            <div key={idx} className={`flex flex-col items-center justify-center p-1.5 rounded border text-xs ${ans ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">{idx + 1}</span>
                                                <span className={`font-bold ${ans ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-300 dark:text-red-400'}`}>
                                                    {ans || '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => { setResult(null); if (!calibrationImage) startCamera(); }}
                                        className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        Retake
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Confirm
                                    </button>
                                </div>

                                {/* EXPORT DATASET (Visible if debug data exists) */}
                                {latestDebugData && (
                                    <button
                                        onClick={handleExportDataset}
                                        disabled={isProcessing}
                                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-sm"
                                    >
                                        <DownloadIcon className="w-4 h-4" />
                                        {isProcessing ? "Zipping..." : "Export Training Data (ZIP)"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ERROR TOAST */}
            {error && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 w-[90%] max-w-sm animate-slide-up border border-red-400/50">
                    <AlertTriangleIcon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-white/20 rounded">
                        <XIcon className="w-4 h-4" />
                    </button>
                    {calibrationImage && (
                        <button onClick={onClose} className="text-xs underline ml-2 whitespace-nowrap">
                            Exit Upload
                        </button>
                    )}
                </div>
            )}

            {/* BOTTOM CONTROLS (Only show if not calibrating OR show calibration controls) */}
            <div className="absolute bottom-0 w-full p-6 pb-8 bg-gradient-to-t from-black via-black/90 to-transparent z-40">

                {calibrationImage ? (
                    // CALIBRATION CONTROLS
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-white/80 text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur border border-white/10">
                            Drag corners to match grid
                        </div>
                        <button
                            onClick={handleCalibrationConfirm}
                            disabled={isProcessing}
                            className="w-full max-w-xs bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <SpinnerIcon className="w-5 h-5 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>Scan Now</span>
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    // NORMAL CONTROLS - CAMERA ONLY
                    <div className="flex items-end justify-center max-w-lg mx-auto">

                        {/* Capture Button (Center) */}
                        <div className="relative -mb-2 mx-auto">
                            <button
                                onClick={handleCapture}
                                disabled={isProcessing}
                                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-16 h-16 bg-white rounded-full group-hover:scale-90 transition-transform duration-300" />
                                {isProcessing && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <SpinnerIcon className="w-8 h-8 text-indigo-600 animate-spin" />
                                    </div>
                                )}
                            </button>
                        </div>

                    </div>
                )}
            </div>

        </div>,
        document.body
    );
};
