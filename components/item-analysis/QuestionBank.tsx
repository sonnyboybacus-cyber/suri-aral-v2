
import React from 'react';
import { UploadIcon, SpinnerIcon } from '../icons';

interface QuestionBankProps {
    testQuestions: string;
    setTestQuestions: (text: string) => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isExtracting: boolean;
    fileInputRef: React.RefObject<HTMLInputElement>;
}

export const QuestionBank = ({
    testQuestions,
    setTestQuestions,
    onFileUpload,
    isExtracting,
    fileInputRef
}: QuestionBankProps) => {
    return (
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 min-h-full">
            <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Paste the test questions or upload a PDF/Image to extract them. This helps the AI understand the content context.
                </p>
                <label className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    {isExtracting ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin text-indigo-500" /> : <UploadIcon className="w-4 h-4 mr-2 text-indigo-500" />}
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {isExtracting ? 'Extracting...' : 'Upload File'}
                    </span>
                    <input 
                        type="file" 
                        accept="application/pdf, image/*" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={onFileUpload} 
                        disabled={isExtracting} 
                    />
                </label>
            </div>
            
            <textarea
                id="testQuestionsInput"
                value={testQuestions}
                onChange={(e) => setTestQuestions(e.target.value)}
                className="w-full h-64 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-sm leading-relaxed"
                placeholder="1. What is the capital of the Philippines?..."
            ></textarea>
        </div>
    );
};
