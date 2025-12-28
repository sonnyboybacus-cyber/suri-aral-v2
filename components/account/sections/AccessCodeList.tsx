import React from 'react';
import { AccessCode, SchoolInfo } from '../../../types';
import {
    KeyIcon, PlusIcon, SpinnerIcon, RefreshIcon, AlertTriangleIcon,
    TrashIcon, FolderIcon, CopyIcon
} from '../../icons';

interface AccessCodeListProps {
    codes: AccessCode[];
    schools: SchoolInfo[];
    isLoading: boolean;
    onCreateCode: () => void;
    onDeleteCode: (id: string) => void;
    onToggleCode: (code: AccessCode) => void; // Assuming toggle logic exists/will exist
}

export const AccessCodeList: React.FC<AccessCodeListProps> = ({
    codes,
    schools,
    isLoading,
    onCreateCode,
    onDeleteCode,
    onToggleCode
}) => {

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            alert("✅ Code copied to clipboard!");
        });
    };

    const getSchoolName = (schoolId?: string) => {
        if (!schoolId) return null;
        const school = schools.find(s => s.id === schoolId);
        return school ? school.schoolName : 'Unknown School';
    };

    const formatExpiration = (expiresAt?: number) => {
        if (!expiresAt) return <span className="text-green-600 dark:text-green-400">Never Expires</span>;

        const isExpired = Date.now() > expiresAt;
        const dateStr = new Date(expiresAt).toLocaleDateString();

        if (isExpired) {
            return <span className="text-red-500 font-bold flex items-center"><AlertTriangleIcon className="w-3 h-3 mr-1" /> Expired {dateStr}</span>;
        }

        const daysLeft = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        return <span className="text-slate-500 dark:text-slate-400">Expires {dateStr} ({daysLeft} days)</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div>
                    <h2 className="font-bold text-indigo-900 dark:text-indigo-200">Access Codes</h2>
                    <p className="text-indigo-600 dark:text-indigo-400 text-sm">Generate registration codes for creating new accounts.</p>
                </div>
                <button
                    onClick={onCreateCode}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold shadow-sm"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Generate Code
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12"><SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : codes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {codes.map(code => (
                        <div key={code.id} className="group relative bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${code.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`}>
                                        {code.role} Code
                                    </span>
                                </div>
                                <button
                                    onClick={() => onDeleteCode(code.id)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="Revoke Code"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="text-center py-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 mb-4 group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                                <div className="text-2xl font-black font-mono tracking-[0.2em] text-slate-700 dark:text-slate-200 select-all">
                                    {code.code}
                                </div>
                                <button
                                    onClick={() => copyCode(code.code)}
                                    className="text-xs font-bold text-indigo-500 hover:text-indigo-600 mt-2 flex items-center justify-center"
                                >
                                    <CopyIcon className="w-3 h-3 mr-1" /> Copy Code
                                </button>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Label:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{code.label}</span>
                                </div>
                                {getSchoolName(code.schoolId) && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">School:</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{getSchoolName(code.schoolId)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <span className="text-slate-500">Status:</span>
                                    {formatExpiration(code.expiresAt)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <KeyIcon className="w-12 h-12 mb-4 opacity-50" />
                    <p>No active access codes found.</p>
                </div>
            )}
        </div>
    );
};
