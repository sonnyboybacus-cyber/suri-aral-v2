import React, { useState } from 'react';
import { EditIcon } from '../icons';

// Helper to parse simple markdown to HTML for display
export const parseMarkdown = (text: string) => {
    if (!text) return '<span class="text-slate-300 italic">Click to edit...</span>';

    let html = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') // Sanitize
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700 dark:text-slate-300">$1</em>') // Italic
        .replace(/^- (.*)$/gm, '<li class="ml-4 list-disc marker:text-indigo-500">$1</li>') // Lists
        .replace(/^• (.*)$/gm, '<li class="ml-4 list-disc marker:text-indigo-500">$1</li>') // Lists with bullets
        .replace(/\n/g, '<br />'); // Newlines

    return html;
};

export const EditableSection = ({
    label,
    value,
    onChange,
    placeholder,
    heightClass = "h-40",
    isSimple = false
}: {
    label: React.ReactNode,
    value: string,
    onChange: (val: string) => void,
    placeholder?: string,
    heightClass?: string,
    isSimple?: boolean
}) => {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className="space-y-2 group h-full flex flex-col">
            <div className="flex justify-between items-end flex-shrink-0 mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    {label}
                </label>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-indigo-500 font-bold flex items-center gap-1"
                    >
                        <EditIcon className="w-3 h-3" /> Edit
                    </button>
                )}
            </div>

            {isEditing ? (
                isSimple ? (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={() => setIsEditing(false)}
                        autoFocus
                        className={`w-full p-4 bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-xl text-sm outline-none shadow-sm ${heightClass === 'h-auto' ? '' : ''}`}
                        placeholder={placeholder}
                    />
                ) : (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={() => setIsEditing(false)}
                        autoFocus
                        className={`w-full p-4 bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-xl text-sm ${heightClass} resize-none outline-none shadow-sm leading-relaxed`}
                        placeholder={placeholder}
                    />
                )
            ) : (
                <div
                    onClick={() => setIsEditing(true)}
                    className={`w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm ${heightClass === 'h-auto' ? '' : `min-${heightClass}`} hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-text overflow-y-auto prose prose-sm max-w-none dark:prose-invert leading-relaxed h-full`}
                >
                    <div dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }} />
                </div>
            )}
        </div>
    );
};
