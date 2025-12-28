// =========================================================================
// QUESTION IMPORTER COMPONENT
// =========================================================================

import React, { useState } from 'react';
import { ImportFormat } from '../../types/questionBank';
import { XIcon, UploadIcon, SpinnerIcon, AlertTriangleIcon, CheckCircleIcon, FileIcon, SparklesIcon, ChevronDownIcon } from '../icons';
import { extractTextFromPDF, parseRawQuestions, parseAnswerKey } from '../../services/pdf/simplePdfParser';
import { extractTextFromDocx } from '../../services/docx/simpleDocxParser';

interface Props {
    defaultMetadata: {
        subject: string;
        gradeLevel: string;
    };
    onImport: (text: string, format: ImportFormat, metadata: { subject: string; gradeLevel: string }) => Promise<{ success: number; failed: number; errors: string[] }>;
    onClose: () => void;
    isSaving: boolean;
}


const IMPORT_FORMATS: { value: ImportFormat; label: string; description: string; example?: string }[] = [
    {
        value: 'numbered',
        label: 'Numbered Text',
        description: 'Questions with numbered options',
        example: `1. What is the capital of the Philippines?
A. Manila
B. Cebu
C. Davao
D. Quezon City
Answer: A`
    },
    {
        value: 'pdf',
        label: 'PDF Upload',
        description: 'Upload Question & Answer Key (Raw Text)',
    },
    {
        value: 'json',
        label: 'JSON Data',
        description: 'Structured JSON array',
        example: `[
  {
    "questionText": "What is the capital?",
    "options": [
      {"letter": "A", "text": "Manila"},
      {"letter": "B", "text": "Cebu"}
    ],
    "correctAnswer": "A"
  }
]`
    },
    {
        value: 'tabular',
        label: 'Tabular (Excel)',
        description: 'Tab-separated values (copy from Excel)',
        example: `Question\tA\tB\tC\tD\tAnswer
What is 2+2?\t3\t4\t5\t6\tB`
    }
];

export const QuestionImporter: React.FC<Props> = ({
    defaultMetadata,
    onImport,
    onClose,
    isSaving
}) => {
    const [selectedFormat, setSelectedFormat] = useState<ImportFormat>('numbered');
    const [text, setText] = useState('');
    const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

    // PDF State
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Upload, 2=ReviewText, 3=PreviewJSON
    const [qFile, setQFile] = useState<File | null>(null);
    const [rawQText, setRawQText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);

    const handleImport = async () => {
        if (!text.trim()) {
            alert('Please paste or extract your questions first');
            return;
        }

        // If currently on PDF tab but text is filled (extracted), switch logic to JSON because extracting produces JSON
        let formatToUse = selectedFormat;
        if (selectedFormat === 'pdf') {
            // If we are in PDF mode but have text, it means we extracted it. Treat as JSON.
            formatToUse = 'json';
        }

        const importResult = await onImport(text, formatToUse, defaultMetadata);
        setResult(importResult);

        if (importResult.success > 0 && importResult.failed === 0) {
            setTimeout(() => onClose(), 2000);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setQFile(file);
    };

    const handleInitialExtract = async () => {
        if (!qFile) return;
        setIsExtracting(true);
        try {
            let qText = '';

            if (qFile.name.toLowerCase().endsWith('.docx')) {
                qText = await extractTextFromDocx(qFile);
            } else {
                qText = await extractTextFromPDF(qFile);
            }

            // 1. Try to find Answer Key in the Question Text
            const splitResult = tryAutoSplitKey(qText);
            let textToParse = qText;
            let answerKeyMap: Record<string, string> = {};

            if (splitResult) {
                // We found a key, let's try to merge it!
                textToParse = splitResult.qPart;
                try {
                    answerKeyMap = parseAnswerKey(splitResult.aPart);
                } catch (e) {
                    console.warn("Found key but failed to parse it", e);
                }
            }

            // 2. Parse the Question Text (either Full or Part)
            // Even if we didn't split, we parse it to see if we can re-serialize it nicely
            const tempQuestions = parseRawQuestions(textToParse);

            if (tempQuestions.length > 0) {
                // 3. RE-SERIALIZE to Standard Numbered Text
                // This ensures the "Review Text" step always looks perfect (User request)
                const formattedText = tempQuestions.map(q => {
                    let block = `${q.id}. ${q.text}`;

                    if (q.options.length > 0) {
                        block += '\n' + q.options.map(o => `${o.letter}. ${o.text}`).join('\n');
                    }

                    // Answer Priority: 1. Merged Answer Key  2. Inline Answer (if no key merged)
                    const ans = answerKeyMap[q.id.toString()] || q.inlineAnswer;
                    if (ans) {
                        block += `\nAnswer: ${ans}`;
                    }
                    return block;
                }).join('\n\n');

                setRawQText(formattedText);
                setStep(2);

                if (splitResult && Object.keys(answerKeyMap).length > 0) {
                    alert(`Success! Auto-detected answer key. Please review the numbered text below.`);
                } else {
                    alert("Text extracted and auto-formatted. Please review.");
                }
                return;
            }

            // Fallback: If parsing failed completely (0 questions found), just show raw text
            setRawQText(qText);
            setStep(2);
            alert("Could not auto-detect questions. Please review the extracted text.");

        } catch (e: any) {
            alert("Failed to extract text: " + e.message);
        } finally {
            setIsExtracting(false);
        }
    };

    /**
     * Helper to auto-split text if Answer Key is detected at the bottom of the Question Text
     */
    const tryAutoSplitKey = (fullText: string) => {
        // Common headers for Answer Keys - Relaxed regex
        // Matches: "Answer Key", "Key to Correction", "Answers", "Key", "Answer Key:", "KEY"
        // At the start of a line, or after double newlines
        const splitPattern = /(?:^|\n\s*|\n\n)(?:Answer\s*Key|Key\s*to\s*Correction|Answers|Key|Correction\s*Key|Correct\s*Answers)[\s:-]*(?=\n|$)/i;
        const match = fullText.match(splitPattern);

        if (match && match.index) {
            const qPart = fullText.substring(0, match.index).trim();
            const aPart = fullText.substring(match.index).trim(); // Include the header
            return { qPart, aPart };
        }
        return null;
    };

    const handleParseAndMerge = () => {
        try {
            // Since everything is now in one box (possibly merged), we just parse it as raw questions.
            const questions = parseRawQuestions(rawQText);

            const merged = questions.map(q => ({
                questionText: q.text,
                questionType: 'multiple_choice', // Default assumption
                options: q.options,
                // @ts-ignore - inlineAnswer is a transient property from the new parser logic
                correctAnswer: q.inlineAnswer || '',
                explanation: ''
            }));

            if (merged.length === 0) {
                alert("No questions could be parsed from the text. Please check the format in the Review step.");
                return;
            }

            setText(JSON.stringify(merged, null, 2));
            setStep(3);
            alert(`Parsed ${merged.length} questions! Review the JSON below.`);
        } catch (e: any) {
            alert("Error parsing questions: " + e.message);
        }
    };

    const selectedFormatInfo = IMPORT_FORMATS.find(f => f.value === selectedFormat);

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Bulk Import Questions</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {selectedFormat === 'pdf'
                                ? 'Upload PDFs, review extracted text, and import.'
                                : 'Paste formatted text to import multiple questions at once'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Format Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Select Import Method</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {IMPORT_FORMATS.map(format => (
                                <button
                                    key={format.value}
                                    onClick={() => setSelectedFormat(format.value)}
                                    className={`p-4 rounded-xl text-left transition-all border-2 flex flex-col justify-between h-full ${selectedFormat === format.value
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <div className="font-bold text-sm text-slate-800 dark:text-white mb-1">{format.label}</div>
                                    <div className="text-[10px] text-slate-500 leading-tight">{format.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PDF UPLOAD WIZARD */}
                    {selectedFormat === 'pdf' ? (
                        <div className="space-y-6 animate-fade-in">
                            {/* Steps Indicator */}
                            <div className="flex items-center justify-between px-10 mb-6">
                                {[
                                    { step: 1, label: 'Upload Files' },
                                    { step: 2, label: 'Review Text' },
                                    { step: 3, label: 'Import' }
                                ].map((s, idx) => (
                                    <div key={s.step} className="flex flex-col items-center z-10">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step >= s.step
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                            }`}>
                                            {s.step}
                                        </div>
                                        <span className={`text-[10px] uppercase font-bold mt-2 ${step >= s.step ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                            {s.label}
                                        </span>
                                    </div>
                                ))}
                                {/* Progress Bar Line - Approximate visual fix */}
                                <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-100 dark:bg-slate-700 -z-0 mx-20 hidden md:block"></div>
                            </div>

                            {/* STEP 1: UPLOAD */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 space-y-6">
                                        {/* Question File */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                                                1. Upload Question Paper (PDF or Word) *
                                            </label>
                                            <label className={`cursor-pointer flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${qFile
                                                ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/20'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-emerald-400'
                                                }`}>
                                                <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleFileChange} />
                                                <div className={`p-2 rounded-full ${qFile ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                    {qFile ? <CheckCircleIcon className="w-5 h-5" /> : <UploadIcon className="w-5 h-5" />}
                                                </div>
                                                <span className={`text-sm font-medium ${qFile ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>
                                                    {qFile ? qFile.name : 'Click to browse files...'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleInitialExtract}
                                        disabled={!qFile || isExtracting}
                                        className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isExtracting ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Extract Text & Review'}
                                    </button>
                                </div>
                            )}

                            {/* STEP 2: REVIEW TEXT */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="h-[500px]">
                                        <div className="flex flex-col h-full">
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-2">Review Extracted Text & Answers</label>
                                            <textarea
                                                value={rawQText}
                                                onChange={e => setRawQText(e.target.value)}
                                                className="flex-1 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-sm font-mono resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Back</button>
                                        <button
                                            onClick={handleParseAndMerge}
                                            className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all"
                                        >
                                            Parse & Match Questions
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: PREVIEW (Reuse existing JSON view) */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 flex items-center gap-3">
                                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                        <p className="text-sm text-green-700 dark:text-green-300">
                                            Questions parsed successfully! Use the view below to verify the <strong>structure</strong> before importing.
                                        </p>
                                    </div>
                                    <textarea
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none h-[500px] font-mono focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                                    />
                                    <div className="flex justify-end gap-3 mt-4">
                                        <button onClick={() => setStep(2)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Back to Review</button>
                                        <button
                                            onClick={handleImport}
                                            disabled={isSaving}
                                            className="px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-xl hover:bg-emerald-600 disabled:opacity-50 flex items-center shadow-lg shadow-emerald-500/20"
                                        >
                                            {isSaving ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : <UploadIcon className="w-4 h-4 mr-2" />}
                                            Import JSON Data
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // TEXT IMPORT UI
                        <div className="space-y-6">
                            {/* Example */}
                            {selectedFormatInfo?.example && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Example Format</label>
                                    <pre className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono border border-slate-200 dark:border-slate-700">
                                        {selectedFormatInfo.example}
                                    </pre>
                                </div>
                            )}

                            {/* Text Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    {selectedFormat === 'json' ? 'JSON Data (Review content here)' : 'Paste Your Questions'}
                                </label>
                                <textarea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none h-64 font-mono focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                                    placeholder={selectedFormat === 'json' ? 'JSON will appear here after extraction...' : 'Paste your formatted questions here...'}
                                />
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className={`p-4 rounded-xl animate-fade-in ${result.failed === 0 && result.success > 0
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : result.success === 0
                                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                            }`}>
                            <div className="flex items-center gap-3">
                                {result.failed === 0 && result.success > 0 ? (
                                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                ) : (
                                    <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />
                                )}
                                <div>
                                    <div className="font-bold text-sm">
                                        {result.success} imported, {result.failed} failed
                                    </div>
                                    {result.errors.length > 0 && (
                                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                            {result.errors.slice(0, 3).join('; ')}
                                            {result.errors.length > 3 && ` ...and ${result.errors.length - 3} more`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                    >
                        Cancel
                    </button>
                    {selectedFormat !== 'pdf' && (
                        <button
                            onClick={handleImport}
                            disabled={isSaving || !text.trim()}
                            className="px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-xl hover:bg-emerald-600 disabled:opacity-50 flex items-center transition-all shadow-lg shadow-emerald-500/20"
                        >
                            {isSaving && <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />}
                            <UploadIcon className="w-4 h-4 mr-2" />
                            Import {selectedFormat === 'json' ? 'Extracted' : ''} Questions
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
