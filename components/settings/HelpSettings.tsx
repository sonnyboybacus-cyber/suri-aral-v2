import React from 'react';
import jsPDF from 'jspdf';
import { PrinterIcon } from '../icons';

export const HelpSettings: React.FC = () => {
    const handleDownloadManual = () => {
        const doc = new jsPDF();
        const margin = 20;
        let y = margin;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);

        const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = '#000000') => {
            doc.setFontSize(fontSize);
            doc.setTextColor(color);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');

            const lines = doc.splitTextToSize(text, contentWidth);
            const lineHeight = fontSize * 0.5;

            if (y + (lines.length * lineHeight) > 280) {
                doc.addPage();
                y = margin;
            }

            doc.text(lines, margin, y);
            y += (lines.length * lineHeight) + 5;
        };

        // Header
        doc.setFillColor(79, 70, 229); // Indigo-600
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("SURI-ARAL User Manual", margin, 25);

        y = 50;

        // Introduction
        addText("1. Introduction", 16, true, '#4338ca');
        addText("SURI-ARAL is an AI-augmented Learning Management System designed to streamline educational tasks. It combines traditional data management with advanced AI tools for analysis, planning, and personalized learning.", 11);
        y += 5;

        // AI Tools
        addText("2. AI Augmented Tools", 16, true, '#4338ca');

        addText("Learn SA (AI Tutor)", 12, true);
        addText("A personalized curriculum generator. Enter any topic to generate a structured 5-7 module learning path. Includes voice interaction and Socratic questioning.", 10);

        addText("Smart Lesson Planner", 12, true);
        addText("Generates detailed, DepEd-compliant Lesson Plans (DLP) in seconds. Supports 4As, Inductive, and Inquiry-based strategies. Exports to PDF.", 10);

        addText("Item Analysis AI", 12, true);
        addText("Analyzes test scores to calculate MPS (Mean Percentage Score) and identify least-mastered skills. Can generate remedial questions automatically.", 10);

        addText("History SA", 12, true);
        addText("Visualizes historical data using interactive timelines and comparison tables.", 10);

        addText("Data SA", 12, true);
        addText("A general-purpose statistical engine. Upload CSV/JSON datasets to auto-generate charts, find trends, and perform hypothesis testing.", 10);

        addText("Reading SA", 12, true);
        addText("Fluency coach. Records audio, analyzes pronunciation accuracy against a reference text, and calculates WPM (Words Per Minute).", 10);
        y += 5;

        // Data Management
        addText("3. Academic Management", 16, true, '#4338ca');
        addText("Student Information (SF1): Manage enrollment records. Supports recycling bin for accidental deletions.", 10);
        addText("Teacher Information: Manage faculty profiles and create user accounts for teachers.", 10);
        addText("Class Information: Organize sections, assign advisers, and manage subject loads.", 10);
        y += 5;

        // Support
        addText("4. Support", 16, true, '#4338ca');
        addText("For technical issues, navigate to Settings > Support to file a bug report or contact the administrator.", 10);

        // Footer
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
        }

        doc.save("SURI-ARAL_User_Manual.pdf");
    };

    return (
        <div className="space-y-10 animate-fade-in-up">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">User Manual</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">Detailed guide to SURI-ARAL features.</p>
                </div>
                <button
                    onClick={handleDownloadManual}
                    className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    <PrinterIcon className="w-4 h-4 mr-2" /> Download PDF
                </button>
            </header>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <h3>1. Introduction</h3>
                <p>SURI-ARAL is an advanced educational management system integrating traditional school record-keeping with cutting-edge AI tools powered by Google Gemini. It is designed to assist teachers in analysis, planning, and student support.</p>

                <h3>2. AI Augmented Tools</h3>
                <div className="grid grid-cols-1 gap-6 not-prose mb-8">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">Learn SA (AI Tutor)</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">A personalized learning companion. Enter any topic to generate a complete 5-7 module curriculum. Use the hands-free mode to listen to lessons.</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">Smart Lesson Planner</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Generates detailed, DepEd-compliant Lesson Plans (DLP) based on grade level, subject, and competency codes. Includes export to PDF function.</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-violet-600 dark:text-violet-400 mb-1">Item Analysis AI</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Upload or input test scores to calculate Mean, MPS, and Difficulty Indices. The AI suggests remedial questions for least-mastered competencies.</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-teal-600 dark:text-teal-400 mb-1">Reading SA</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Fluency and pronunciation coach. Records student audio, analyzes accuracy against text, and highlights mispronounced words.</p>
                    </div>
                </div>

                <h3>3. Data Management</h3>
                <ul className="list-disc pl-5 space-y-2 marker:text-indigo-500">
                    <li><strong>Student Records (SF1):</strong> Manage student profiles, LRNs, and demographics. Supports recycle bin recovery for 7 days.</li>
                    <li><strong>Class Management:</strong> Organize sections, assign advisers, and manage subject loads.</li>
                    <li><strong>School Profile:</strong> (Admin Only) Configure school details, facilities, and faculty assignments.</li>
                </ul>

                <h3>4. Privacy & Security</h3>
                <p>All student data processed by AI features is anonymized before transmission. Your passwords and personal data are encrypted. Use the 'Account' tab to update your credentials.</p>
            </div>
        </div>
    );
};
