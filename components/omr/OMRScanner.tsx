
import React, { useRef, useState, useEffect } from 'react';
import { CameraIcon, UploadIcon, XIcon, SpinnerIcon, CheckCircleIcon, AlertTriangleIcon } from '../icons';
import { gradeAnswerSheet } from '../../services/omrEngine';

interface OMRScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScanComplete: (answers: string[]) => void;
    totalItems: number;
}

export const OMRScanner: React.FC<OMRScannerProps> = ({ isOpen, onClose, onScanComplete, totalItems }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string[] | null>(null);

    // Start Camera on Mount
    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        setIsCameraActive(true);
        setError(null);
        setResult(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            streamRef.current = stream;
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

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current || isProcessing) return;

        setIsProcessing(true);
        setError(null);

        // Draw to canvas
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Process
            try {
                // Pass the canvas directly to OMR Engine
                const gradingResult = await gradeAnswerSheet(canvas, totalItems);
                setResult(gradingResult.answers);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to scan answer sheet. Ensure all 4 corners are visible.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setResult(null);

        const img = new Image();
        img.onload = async () => {
            try {
                // Create a canvas to pass to OMR
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);

                const gradingResult = await gradeAnswerSheet(canvas, totalItems);
                setResult(gradingResult.answers);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to process image.");
            } finally {
                setIsProcessing(false);
            }
        };
        img.onerror = () => {
            setError("Failed to load image file.");
            setIsProcessing(false);
        };
        img.src = URL.createObjectURL(file);
    };

    const handleConfirm = () => {
        if (result) {
            onScanComplete(result);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black bg-opacity-90 flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center p-6 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-20">
                <div className="text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <CameraIcon className="w-5 h-5 text-indigo-400" />
                        OMR Scanner
                    </h3>
                    <p className="text-xs text-gray-300">Align the 4 corner markers within the frame</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <XIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Main Viewport */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                {result ? (
                    // Result Preview
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full m-4 shadow-2xl animate-scale-up z-30">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Scan Successful</h3>
                            <p className="text-sm text-slate-500">Detected {result.filter(x => x).length} of {totalItems} answers</p>
                        </div>

                        <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto mb-6 p-2 custom-scrollbar">
                            {result.slice(0, totalItems).map((ans, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <span className="text-[10px] text-slate-400">{i + 1}</span>
                                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm ${ans ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-300'}`}>
                                        {ans || '-'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => { setResult(null); setError(null); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                Scan Again
                            </button>
                            <button onClick={handleConfirm} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-colors">
                                Confirm
                            </button>
                        </div>
                    </div>
                ) : (
                    // Camera View with Overlay
                    <>
                        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Guide Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-[85%] h-[70%] border-2 border-indigo-400/50 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                {/* Corner Markers */}
                                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-indigo-500 rounded-br-xl -mb-1 -mr-1"></div>

                                {/* Scanning Line Animation */}
                                {isProcessing && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="absolute top-24 left-6 right-6 mx-auto max-w-sm bg-red-500/90 text-white p-4 rounded-xl backdrop-blur-md shadow-lg animate-shake flex items-start gap-3 z-30">
                                <AlertTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-sm">Scan Failed</p>
                                    <p className="text-xs opacity-90">{error}</p>
                                </div>
                                <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-white/20 rounded"><XIcon className="w-4 h-4" /></button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Controls */}
            {!result && (
                <div className="p-8 bg-black/80 backdrop-blur-xl border-t border-white/10 flex justify-center items-center gap-8 relative z-20">
                    <label className="flex flex-col items-center gap-2 cursor-pointer group">
                        <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10">
                            <UploadIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs text-slate-400 font-medium group-hover:text-white transition-colors">Upload File</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
                    </label>

                    <button
                        onClick={handleCapture}
                        disabled={isProcessing}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none"
                    >
                        {isProcessing ? (
                            <SpinnerIcon className="w-8 h-8 text-white animate-spin" />
                        ) : (
                            <div className="w-16 h-16 bg-white rounded-full transition-all group-active:scale-90"></div>
                        )}
                    </button>

                    <div className="w-12 opacity-0"></div> {/* Spacer for balance */}
                </div>
            )}
        </div>
    );
};
