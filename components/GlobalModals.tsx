import React, { useState } from 'react';
import { XIcon, SearchIcon, ChevronDownIcon, BugIcon, CheckCircleIcon, ShieldIcon, FileTextIcon, HelpIcon } from './icons';

type ModalType = 'privacy' | 'terms' | 'help' | 'bug' | null;

interface GlobalModalManagerProps {
    activeModal: ModalType;
    onClose: () => void;
}

// --- 1. REUSABLE GLASS MODAL WRAPPER ---
const InfoModal = ({ title, icon, children, onClose }: { title: string, icon?: React.ReactNode, children?: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in">
        <div className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-scale-up transform transition-all">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 z-10">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {icon && <span className="text-indigo-500">{icon}</span>}
                    {title}
                </h3>
                <button 
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                {children}
            </div>
        </div>
    </div>
);

// --- 2. CONTENT VARIANTS ---

const PrivacyContent = () => (
    <div className="prose prose-slate dark:prose-invert prose-sm max-w-none">
        <p className="lead text-slate-600 dark:text-slate-300">
            At SURI-ARAL, we prioritize the security and confidentiality of your educational data. This policy outlines how we handle your information.
        </p>

        <h4>1. Data We Collect</h4>
        <ul className="list-disc pl-4 space-y-1">
            <li><strong>Account Info:</strong> Name, email, and professional title (Teacher/Admin).</li>
            <li><strong>School Data:</strong> Student names (SF1), grades, class lists, and schedules.</li>
            <li><strong>Activity Logs:</strong> Metadata about your usage for system auditing.</li>
        </ul>

        <h4>2. AI Processing (Gemini)</h4>
        <p>
            We use Google's Gemini AI to power features like Item Analysis and the Assistant. 
            <strong className="text-indigo-600 dark:text-indigo-400"> We anonymize student data</strong> before sending statistical summaries to the AI. 
            Your raw student records are never used to train public AI models.
        </p>

        <h4>3. Data Security</h4>
        <p>
            All data is encrypted in transit (HTTPS) and at rest within our secure Firebase database. Access is strictly role-based; teachers cannot access administrative logs.
        </p>

        <h4>4. Your Rights</h4>
        <p>
            You own your data. You can export your reports to PDF/CSV or request full account deletion via the Settings panel at any time.
        </p>
    </div>
);

const TermsContent = () => (
    <div className="prose prose-slate dark:prose-invert prose-sm max-w-none">
        <p className="lead text-slate-600 dark:text-slate-300">
            By using SURI-ARAL, you agree to the following terms designed to ensure academic integrity and professional conduct.
        </p>

        <h4>1. Purpose of Use</h4>
        <p>
            SURI-ARAL is an <strong>educational support tool</strong>. It is intended to assist teachers in analysis and planning, not to replace professional judgment.
        </p>

        <h4>2. User Responsibilities</h4>
        <ul className="list-disc pl-4 space-y-1">
            <li>You agree not to use the AI to generate fraudulent reports or fabricated data.</li>
            <li>You are responsible for verifying the accuracy of AI-generated Lesson Plans before use in class.</li>
            <li>You must maintain the confidentiality of student data accessed through your account.</li>
        </ul>

        <h4>3. Intellectual Property</h4>
        <p>
            The SURI-ARAL platform and its code are proprietary. However, the <strong>content you generate</strong> (Lesson Plans, Reports) belongs to you and your institution.
        </p>

        <h4>4. Liability Disclaimer</h4>
        <p>
            The service is provided "as is". SURI-ARAL is not liable for data loss or academic discrepancies resulting from the misuse of the tool.
        </p>
    </div>
);

const HelpCenterContent = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [search, setSearch] = useState('');

    const faqs = [
        { 
            q: "How do I upload a class list?", 
            a: "Navigate to 'Class Information' via the sidebar. Select 'New Class' to create a section, then use the manual entry form or bulk upload your student roster." 
        },
        { 
            q: "How does the Item Analysis work?", 
            a: "After creating an analysis session, input the answer key and student responses. SURI-ARAL calculates the MPS (Mean Percentage Score) and difficulty level for each item automatically." 
        },
        { 
            q: "Can I export my Lesson Plan?", 
            a: "Yes! In the Smart Lesson Planner, once your plan is generated, click the 'Export PDF' button in the top toolbar to download a DepEd-compliant DLP format." 
        },
        { 
            q: "Is my data private?", 
            a: "Absolutely. We use enterprise-grade encryption. Student data is anonymized before being processed by our AI features to ensure privacy compliance." 
        },
        {
            q: "How do I reset my password?",
            a: "Go to 'Settings' > 'Account & Security' and click 'Change Password'. If you cannot log in, contact your School Administrator."
        }
    ];

    const filteredFaqs = faqs.filter(f => 
        f.q.toLowerCase().includes(search.toLowerCase()) || 
        f.a.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search for help topics..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
            </div>

            {/* FAQ List */}
            <div className="space-y-3">
                {filteredFaqs.map((faq, idx) => (
                    <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden">
                        <button 
                            onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                            className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{faq.q}</span>
                            <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ${openFaq === idx ? 'max-h-40' : 'max-h-0'}`}>
                            <div className="p-4 pt-0 text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700/50">
                                {faq.a}
                            </div>
                        </div>
                    </div>
                ))}
                {filteredFaqs.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No results found.</p>
                )}
            </div>

            {/* Footer Contact */}
            <div className="mt-8 text-center pt-6 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 mb-3">Still need help?</p>
                <a 
                    href="mailto:support@suriaral.com" 
                    className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-full transition-colors shadow-md"
                >
                    Contact Support Team
                </a>
            </div>
        </div>
    );
};

const BugReportContent = ({ onClose }: { onClose: () => void }) => {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [issueType, setIssueType] = useState('Bug');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate API call
        setTimeout(() => {
            setStep('success');
        }, 800);
    };

    if (step === 'success') {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                    <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Report Received</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-8">
                    Thank you for helping us improve SURI-ARAL. Our team will review this issue shortly.
                </p>
                <button 
                    onClick={onClose}
                    className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
                >
                    Close Window
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Issue Type</label>
                    <select 
                        value={issueType}
                        onChange={e => setIssueType(e.target.value)}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option>Bug / Error</option>
                        <option>Feature Request</option>
                        <option>UI / Design Issue</option>
                        <option>Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Where did it happen?</label>
                    <input type="text" placeholder="e.g. Dashboard, Lesson Planner" className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                <textarea 
                    className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Please describe what happened and what you expected to see..."
                    required
                ></textarea>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Severity</label>
                <div className="flex gap-4">
                    {['Low', 'Medium', 'Critical'].map(level => (
                        <label key={level} className="flex items-center gap-2 cursor-pointer group">
                            <input type="radio" name="severity" className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                            <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">{level}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5"
                >
                    Submit Report
                </button>
            </div>
        </form>
    );
};


// --- 3. MAIN EXPORT ---
export const GlobalModalManager = ({ activeModal, onClose }: GlobalModalManagerProps) => {
    if (!activeModal) return null;

    const contentMap = {
        privacy: { title: 'Privacy Policy', icon: <ShieldIcon className="w-5 h-5"/>, component: <PrivacyContent /> },
        terms: { title: 'Terms of Service', icon: <FileTextIcon className="w-5 h-5"/>, component: <TermsContent /> },
        help: { title: 'Help Center', icon: <HelpIcon className="w-5 h-5"/>, component: <HelpCenterContent /> },
        bug: { title: 'Report an Issue', icon: <BugIcon className="w-5 h-5"/>, component: <BugReportContent onClose={onClose} /> }
    };

    const config = contentMap[activeModal];

    return (
        <InfoModal title={config.title} icon={config.icon} onClose={onClose}>
            {config.component}
        </InfoModal>
    );
};