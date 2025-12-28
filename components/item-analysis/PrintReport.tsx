
import React from 'react';
import { TestMetadata, Student, ItemAnalysisResult } from '../../types';
import { BrainCircuitIcon } from '../icons';

interface PrintReportProps {
    metadata: TestMetadata;
    students: Student[];
    analysisResults: ItemAnalysisResult[];
    aiAnalysisReport: string | null;
}

// Helper to parse markdown for the print view
const parseMarkdownForPrint = (text: string) => {
    if (!text) return null;
    let html = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 border-b border-slate-800 pb-1">$1</h2>')
        .replace(/^\s*[\-\*] (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
        .replace(/\n/g, '<br />');
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export const PrintReport = ({ metadata, students, analysisResults, aiAnalysisReport }: PrintReportProps) => {
    return (
        <div id="analysis-report-print-view" className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 overflow-y-auto text-black">
            <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h1 className="text-2xl font-bold uppercase tracking-wide text-black">Item Analysis Report</h1>
                <h2 className="text-xl font-semibold mt-1 text-black">{metadata.school || 'School Name'}</h2>
                <p className="text-sm text-black mt-1">SURI-ARAL Generated Report</p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm border border-black p-4 rounded-md text-black">
                <div className="flex justify-between"><span className="font-bold">Examination:</span> <span>{metadata.titleOfExamination}</span></div>
                <div className="flex justify-between"><span className="font-bold">Subject:</span> <span>{metadata.subject}</span></div>
                <div className="flex justify-between"><span className="font-bold">Grade & Section:</span> <span>{metadata.gradeLevel} - {metadata.section}</span></div>
                <div className="flex justify-between"><span className="font-bold">Teacher:</span> <span>{metadata.teacherInCharge}</span></div>
                <div className="flex justify-between"><span className="font-bold">School Year:</span> <span>{metadata.schoolYear}</span></div>
                <div className="flex justify-between"><span className="font-bold">Date Generated:</span> <span>{new Date().toLocaleDateString()}</span></div>
            </div>

            <div className="mb-8">
                <h3 className="font-bold text-lg uppercase border-b border-black mb-3 text-black">Performance Summary</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="border border-gray-400 p-3 rounded bg-gray-50">
                        <div className="text-xs font-bold uppercase text-black">Mean Score</div>
                        <div className="text-xl font-bold text-black">{(students.reduce<number>((acc, s) => acc + s.responses.reduce<number>((a, b) => a + b, 0), 0) / (students.length || 1)).toFixed(2)}</div>
                    </div>
                    <div className="border border-gray-400 p-3 rounded bg-gray-50">
                        <div className="text-xs font-bold uppercase text-black">MPS</div>
                        <div className="text-xl font-bold text-black">{(analysisResults.reduce<number>((acc, r) => acc + r.mps, 0) / (analysisResults.length || 1)).toFixed(2)}%</div>
                    </div>
                    <div className="border border-gray-400 p-3 rounded bg-gray-50">
                        <div className="text-xs font-bold uppercase text-black">Total Students</div>
                        <div className="text-xl font-bold text-black">{students.length}</div>
                    </div>
                    <div className="border border-gray-400 p-3 rounded bg-gray-50">
                        <div className="text-xs font-bold uppercase text-black">Total Items</div>
                        <div className="text-xl font-bold text-black">{metadata.totalItems}</div>
                    </div>
                </div>
            </div>

            {analysisResults.length > 0 && (
                <div className="mb-8 break-inside-avoid">
                    <h3 className="font-bold text-lg uppercase border-b border-black mb-3 text-black">Item Analysis Data</h3>
                    <table className="w-full text-sm border-collapse border border-black text-black">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black px-2 py-1 text-black">Item #</th>
                                <th className="border border-black px-2 py-1 text-black">Correct</th>
                                <th className="border border-black px-2 py-1 text-black">MPS</th>
                                <th className="border border-black px-2 py-1 text-black">Difficulty</th>
                                <th className="border border-black px-2 py-1 text-black">Interpretation</th>
                                <th className="border border-black px-2 py-1 text-black w-1/3">Competency</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysisResults.map(r => (
                                <tr key={r.itemNumber}>
                                    <td className="border border-black px-2 py-1 text-center font-bold text-black">{r.itemNumber}</td>
                                    <td className="border border-black px-2 py-1 text-center text-black">{r.totalCorrect}</td>
                                    <td className="border border-black px-2 py-1 text-center text-black">{r.mps.toFixed(0)}%</td>
                                    <td className="border border-black px-2 py-1 text-center text-black">{r.difficulty}</td>
                                    <td className="border border-black px-2 py-1 text-center">
                                        <span className={`font-bold ${r.interpretation === 'Mastered' ? 'text-green-800' :
                                            r.interpretation === 'Least Mastered' ? 'text-yellow-800' : 'text-red-800'
                                            }`}>{r.interpretation}</span>
                                    </td>
                                    <td className="border border-black px-2 py-1 text-xs text-black">{r.competency || ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {aiAnalysisReport && (
                <div className="mb-6 break-inside-avoid">
                    <h3 className="font-bold text-lg uppercase border-b border-black mb-3 flex items-center text-black">
                        <BrainCircuitIcon className="w-5 h-5 mr-2 text-black" /> SURI-ARAL AI Insights
                    </h3>
                    <div className="text-sm text-justify leading-relaxed prose max-w-none text-black">
                        {parseMarkdownForPrint(aiAnalysisReport)}
                    </div>
                </div>
            )}

            <div className="mt-12 pt-8 border-t border-black flex justify-between text-sm text-black">
                <div className="text-center">
                    <p className="font-bold border-t border-black pt-1 w-48">{metadata.teacherInCharge || 'Teacher'}</p>
                    <p>Prepared By</p>
                </div>
                <div className="text-center">
                    <p className="font-bold border-t border-black pt-1 w-48">{metadata.schoolHead || 'Principal'}</p>
                    <p>Noted By</p>
                </div>
            </div>
        </div>
    );
};
