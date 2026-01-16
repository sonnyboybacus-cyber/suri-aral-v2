
import React from 'react';
import { SunIcon, MaximizeIcon, LayersIcon, XIcon, CheckCircleIcon } from '../icons';

interface ScanInstructionsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ScanInstructions: React.FC<ScanInstructionsProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up border border-white/10">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-600">
                    <div>
                        <h3 className="text-xl font-bold text-white">Scanning Tips</h3>
                        <p className="text-indigo-100 text-sm">Follow these guides for 100% accuracy</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Tip 1: Lighting */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <SunIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Good Lighting is Key</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Avoid shadows on the paper. Use bright, even lighting or natural sunlight for best results.
                            </p>
                        </div>
                    </div>

                    {/* Tip 2: Background */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <LayersIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Use a Dark Background</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Place the white answer sheet on a dark table or surface. The high contrast helps detect the paper.
                            </p>
                        </div>
                    </div>

                    {/* Tip 3: Alignment */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <MaximizeIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Capture All 4 Corners</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Ensure the 4 black square markers are clearly visible inside the camera frame.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-center border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
};
