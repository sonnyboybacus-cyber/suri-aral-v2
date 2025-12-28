import React, { useRef, useState } from 'react';
import { Student, TestMetadata } from '../../types';
import { TrashIcon, CheckCircleIcon, XIcon, UserPlusIcon, BarChart3Icon, CameraIcon, UploadIcon, MessageSquareIcon, TrendingUpIcon, PrinterIcon, SpinnerIcon } from '../icons';
import { OMRScanner } from '../omr/OMRScanner';
import { gradeAnswerSheet } from '../../services/omrEngine';

interface ScoreEncoderProps {
    students: Student[];
    metadata: TestMetadata;
    onStudentsChange: (students: Student[]) => void;
    onCalculate: () => void;
    onRecordHistory: () => void;
    onPrintSheet: () => void;
    onOpenProgress: (student: Student) => void;
    isSaving: boolean;
}

// --- SUB-COMPONENT: FEEDBACK MODAL ---
const FeedbackEditorModal = ({
    studentName,
    initialFeedback,
    onSave,
    onClose
}: {
    studentName: string,
    initialFeedback: string,
    onSave: (feedback: string) => void,
    onClose: () => void
}) => {
    const [feedback, setFeedback] = useState(initialFeedback);
    const quickChips = ["Excellent work!", "Needs improvement in math.", "Great participation.", "Please review Module 3.", "Outstanding performance!", "Keep it up!"];

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all scale-100">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Student Feedback</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">For {studentName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full h-40 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-slate-700 dark:text-slate-200 text-sm leading-relaxed shadow-sm"
                        placeholder="Write constructive feedback here..."
                        autoFocus
                    />

                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Quick Add</p>
                        <div className="flex flex-wrap gap-2">
                            {quickChips.map((chip, i) => (
                                <button
                                    key={i}
                                    onClick={() => setFeedback(prev => prev ? `${prev} ${chip}` : chip)}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-white dark:bg-slate-800">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                    <button
                        onClick={() => onSave(feedback)}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 flex items-center"
                    >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        Save Feedback
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ScoreEncoder: React.FC<ScoreEncoderProps> = ({
    students,
    metadata,
    onStudentsChange,
    onCalculate,
    onRecordHistory,
    onPrintSheet,
    onOpenProgress,
    isSaving
}) => {
    // Camera State
    // Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [activeStudentIndex, setActiveStudentIndex] = useState<number | null>(null);

    // Modal States
    const [editingFeedbackIndex, setEditingFeedbackIndex] = useState<number | null>(null);
    const [debugImage, setDebugImage] = useState<string | null>(null);

    // Helper to update specific student answer
    const handleScoreChange = (studentIndex: number, itemIndex: number, val: string) => {
        const newStudents = [...students];
        const answer = val.toUpperCase().substring(0, 1); // Ensure A, B, C, D only (or allow others but cap at 1 char)
        newStudents[studentIndex].studentAnswers[itemIndex] = answer;
        onStudentsChange(newStudents);
    };

    const handleSaveFeedback = (feedback: string) => {
        if (editingFeedbackIndex !== null) {
            const newStudents = [...students];
            newStudents[editingFeedbackIndex].feedback = feedback;
            onStudentsChange(newStudents);
            setEditingFeedbackIndex(null);
        }
    };

    // Camera Logic
    const startCamera = (index: number) => {
        setActiveStudentIndex(index);
        setIsCameraOpen(true);
    };

    const stopCamera = () => {
        setIsCameraOpen(false);
        setActiveStudentIndex(null);
    };

    const handleOMRScanComplete = (answers: string[]) => {
        if (activeStudentIndex !== null) {
            const newStudents = [...students];
            newStudents[activeStudentIndex].studentAnswers = answers;
            onStudentsChange(newStudents);
        }
    };

    const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    try {
                        const gradingResult = await gradeAnswerSheet(canvas, metadata.totalItems);
                        const newStudents = [...students];
                        newStudents[index].studentAnswers = gradingResult.answers;
                        onStudentsChange(newStudents);
                        if (gradingResult.answers.length === 0) {
                            // Show debug view for troubleshooting
                            setDebugImage(canvas.toDataURL());
                        } else {
                            alert(`Scan Complete! Detected ${gradingResult.answers.length} answers.`);
                        }
                    } catch (err: any) {
                        console.error(err);
                        alert(err.message || "Failed to grade image.");
                        // Show debug on error too
                        setDebugImage(canvas.toDataURL());
                    }
                }
            };
            img.src = URL.createObjectURL(file);
        } catch (err) {
            console.error(err);
        }
    };

    if (metadata.totalItems === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mb-4">
                    <BarChart3Icon className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Setup Required</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm text-center">
                    Please set the <strong>Total Items</strong> in the configuration tab effectively.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* OVERLAYS */}
            {/* DEBUG IMAGE MODAL */}
            {debugImage && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setDebugImage(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl max-h-[90vh] overflow-auto p-2" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-red-500">Validation Failed - Debug View</h3>
                            <button onClick={() => setDebugImage(null)}><XIcon className="w-6 h-6" /></button>
                        </div>
                        <img src={debugImage} alt="Debug" className="max-w-full h-auto rounded border-2 border-red-500" />
                        <p className="text-center text-xs text-slate-500 mt-2">
                            Green Box = Paper Detected. Red Circles = Bubbles Detected. <br />
                            If no Green Box: Background is too messy or lighting is bad. Use a dark background.<br />
                            If Green Box but no Red Circles: Bubbles are too faint or resolution is too low.
                        </p>
                    </div>
                </div>
            )}

            {editingFeedbackIndex !== null && (
                <FeedbackEditorModal
                    studentName={students[editingFeedbackIndex].name}
                    initialFeedback={students[editingFeedbackIndex].feedback || ''}
                    onSave={handleSaveFeedback}
                    onClose={() => setEditingFeedbackIndex(null)}
                />
            )}

            {/* Minimalist Camera UI - REPLACED WITH OMR SCANNER */}
            <OMRScanner
                isOpen={isCameraOpen}
                onClose={stopCamera}
                onScanComplete={handleOMRScanComplete}
                totalItems={metadata.totalItems}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Score Entry</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Enter student responses (A, B, C, D) manually or scan answer sheets.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={onPrintSheet}
                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1"
                    >
                        <PrinterIcon className="w-4 h-4" /> Print Sheet
                    </button>
                    <button
                        onClick={onCalculate}
                        disabled={students.length === 0}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none flex items-center gap-1"
                    >
                        <BarChart3Icon className="w-4 h-4" /> Analyze
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-bold w-16 sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50">#</th>
                                <th className="px-6 py-4 font-bold min-w-[200px] sticky left-16 z-10 bg-slate-50 dark:bg-slate-900/50 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)]">Student Name</th>
                                {Array.from({ length: metadata.totalItems }).map((_, i) => (
                                    <th key={i} className="px-2 py-4 font-bold text-center min-w-[3rem]">
                                        {i + 1}
                                        <div className="text-[10px] text-indigo-500 mt-1">{metadata.answerKey?.[i] || '-'}</div>
                                    </th>
                                ))}
                                <th className="px-6 py-4 font-bold text-center sticky right-0 z-10 bg-slate-50 dark:bg-slate-900/50 shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.05)]">Tools</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {students.map((student, sIdx) => {
                                const score = student.studentAnswers.reduce((acc, ans, i) => acc + (ans && metadata.answerKey?.[i] && ans === metadata.answerKey?.[i] ? 1 : 0), 0);
                                return (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-500 sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-indigo-50/10 transition-colors">{sIdx + 1}</td>
                                        <td className="px-6 py-4 sticky left-16 z-10 bg-white dark:bg-slate-800 group-hover:bg-indigo-50/10 transition-colors shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)]">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{student.name}</span>
                                        </td>
                                        {Array.from({ length: metadata.totalItems }).map((_, i) => (
                                            <td key={i} className="p-1 text-center">
                                                <input
                                                    type="text"
                                                    maxLength={1}
                                                    value={student.studentAnswers[i] || ''}
                                                    onChange={(e) => handleScoreChange(sIdx, i, e.target.value.toUpperCase())}
                                                    className={`w-8 h-8 text-center rounded text-sm font-bold uppercase transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none ${student.studentAnswers[i]
                                                        ? metadata.answerKey?.[i] && student.studentAnswers[i] === metadata.answerKey?.[i]
                                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200'
                                                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200'
                                                        : 'bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600'
                                                        }`}
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-2 sticky right-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-indigo-50/10 transition-colors shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.05)]">
                                            <div className="flex justify-center items-center gap-1">
                                                <span className={`mr-3 font-bold ${score >= metadata.totalItems * 0.75 ? 'text-green-600' : score >= metadata.totalItems * 0.5 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                    {score}
                                                </span>
                                                <button onClick={() => startCamera(sIdx)} className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600" title="Scan Paper">
                                                    <CameraIcon className="w-4 h-4" />
                                                </button>
                                                <label className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 cursor-pointer" title="Upload Image">
                                                    <UploadIcon className="w-4 h-4" />
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(sIdx, e)} />
                                                </label>
                                                <button
                                                    onClick={() => setEditingFeedbackIndex(sIdx)}
                                                    className={`p-1.5 rounded-md hover:bg-amber-100 ${student.feedback ? 'text-amber-600 bg-amber-50' : 'text-slate-400'}`}
                                                    title="Feedback"
                                                >
                                                    <MessageSquareIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onOpenProgress(student)}
                                                    className="p-1.5 rounded-md hover:bg-teal-100 text-teal-600"
                                                    title="Analysis History"
                                                >
                                                    <TrendingUpIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {students.length === 0 && (
                    <div className="p-12 text-center">
                        <p className="text-slate-500 dark:text-slate-400">No students loaded. Please select a class in Setup.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-4">
            </div>
        </div>
    );
};
