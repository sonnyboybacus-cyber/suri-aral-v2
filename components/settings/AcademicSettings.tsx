import React, { useState, useEffect } from 'react';
import { AcademicConfig, getAcademicConfig, saveAcademicConfig } from '../../services/databaseService';
import { SettingsCard } from './SharedComponents';
import { PlusIcon, TrashIcon, CalendarIcon, SchoolIcon, BookOpenIcon, CheckSquareIcon, SaveIcon, AlertTriangleIcon } from '../icons';

export const AcademicSettings: React.FC = () => {
    const [config, setConfig] = useState<AcademicConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'calendar' | 'org' | 'curriculum' | 'assessment' | 'facilities'>('calendar');

    // New Item Inputs
    const [newInputs, setNewInputs] = useState<Record<keyof AcademicConfig, string>>({
        schoolYears: '', examTitles: '', quarters: '', semesters: '',
        regions: '', divisions: '', districts: '',
        curriculumTypes: '', gradeLevels: '', sectionNames: '', departments: '', shsClassifications: '',
        tracks: '', strands: '',
        questionTypes: '', cognitiveLevels: '',
        motherTongues: '', studentRemarks: '', qs: '',
        roomTypes: '', roomConditions: ''
    } as any);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setIsLoading(true);
        const data = await getAcademicConfig();
        setConfig(data);
        setIsLoading(false);
    };

    const handleAddItem = (key: keyof AcademicConfig) => {
        if (!config || !newInputs[key]?.trim()) return;

        const newItem = newInputs[key].trim();
        const currentList = config[key] || [];

        if (currentList.includes(newItem)) {
            alert('This item already exists.');
            return;
        }

        const updatedConfig = { ...config, [key]: [...currentList, newItem] };
        setConfig(updatedConfig);
        setNewInputs({ ...newInputs, [key]: '' });
    };

    const handleDeleteItem = (key: keyof AcademicConfig, itemToDelete: string) => {
        if (!config) return;
        if (!confirm(`Are you sure you want to delete "${itemToDelete}"? This may affect records using this value.`)) return;

        const updatedList = (config[key] || []).filter(item => item !== itemToDelete);
        setConfig({ ...config, [key]: updatedList });
    };

    const handleSave = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            await saveAcademicConfig(config);
            alert('Configuration saved successfully!');
        } catch (error: any) {
            console.error(error);
            alert(`Failed to save configuration: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading configuration...</div>;
    if (!config) return <div className="p-8 text-center text-red-500">Failed to load configuration.</div>;

    const sections = [
        { id: 'calendar', label: 'Calendar & Exams', icon: <CalendarIcon className="w-4 h-4" /> },
        { id: 'org', label: 'Organization & Location', icon: <SchoolIcon className="w-4 h-4" /> },
        { id: 'curriculum', label: 'Curriculum & Standards', icon: <BookOpenIcon className="w-4 h-4" /> },
        { id: 'assessment', label: 'TOS & Assessment', icon: <CheckSquareIcon className="w-4 h-4" /> },
        { id: 'facilities', label: 'School Facilities', icon: <SchoolIcon className="w-4 h-4" /> },
    ];

    const renderConfigList = (key: keyof AcademicConfig, title: string, placeholder: string) => (
        <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{title}</label>
            <div className="flex gap-2 mb-3">
                <input
                    type="text"
                    value={newInputs[key] || ''}
                    onChange={(e) => setNewInputs({ ...newInputs, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem(key)}
                />
                <button
                    onClick={() => handleAddItem(key)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {(config[key] || []).map((item, idx) => (
                    <div key={idx} className="group flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
                        <button
                            onClick={() => handleDeleteItem(key, item)}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {(config[key] || []).length === 0 && (
                    <span className="text-xs text-slate-400 italic py-1">No items configured.</span>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in-up pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Academic Configuration</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Manage global dropdown options and system standards.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : <><SaveIcon className="w-5 h-5" /> Save Changes</>}
                </button>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                <AlertTriangleIcon className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-amber-800 dark:text-amber-200 text-sm">System-Wide Impact</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Changes here affect dropdown options for all users immediately. Deleting items that are currently in use by old records will effectively hide those values in future filters, but won't delete the historical data.
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-slate-200 dark:border-slate-800">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-bold text-sm transition-all whitespace-nowrap border-b-2 ${activeSection === section.id
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                    >
                        {section.icon}
                        {section.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                {activeSection === 'calendar' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderConfigList('schoolYears', 'School Years', 'e.g., 2025-2026')}
                        {renderConfigList('examTitles', 'Examination Titles', 'e.g., First Periodical Examination')}
                        {renderConfigList('quarters', 'Quarters', 'e.g., 1st Quarter')}
                        {renderConfigList('semesters', 'Semesters', 'e.g., 1st Semester')}
                    </div>
                )}

                {activeSection === 'org' && (
                    <div className="space-y-8">
                        {renderConfigList('regions', 'Regions', 'e.g., Region VII')}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {renderConfigList('divisions', 'Divisions', 'e.g., Cebu Province')}
                            {renderConfigList('districts', 'Districts', 'e.g., District 1')}
                        </div>
                    </div>
                )}

                {activeSection === 'curriculum' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderConfigList('curriculumTypes', 'Curriculum Types', 'e.g., K-12, ALS')}
                        {renderConfigList('gradeLevels', 'Grade Levels', 'e.g., Grade 11')}
                        {renderConfigList('departments', 'Departments', 'e.g., Science, Mathematics')}
                        {renderConfigList('shsClassifications', 'SHS Classifications', 'e.g., Core, Applied')}
                        {renderConfigList('tracks', 'Senior High Tracks', 'e.g., Academic, TVL')}
                        {renderConfigList('strands', 'Senior High Strands', 'e.g., STEM, HUMSS')}
                        {renderConfigList('motherTongues', 'Mother Tongues', 'e.g., Sinugbuanong Binisaya')}
                        {renderConfigList('sectionNames', 'Standardized Section Names', 'e.g., Einstein, Newton (Optional)')}
                        {renderConfigList('studentRemarks', 'Student Remarks', 'e.g., Promoted, Retained')}
                    </div>
                )}

                {activeSection === 'assessment' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderConfigList('questionTypes', 'Question Types', 'e.g., Multiple Choice')}
                        {renderConfigList('cognitiveLevels', 'Cognitive Levels', 'e.g., Remembering')}
                    </div>
                )}

                {activeSection === 'facilities' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderConfigList('roomTypes', 'Room Types', 'e.g., Instructional, Laboratory')}
                        {renderConfigList('roomConditions', 'Room Conditions', 'e.g., Good, Needs Repair')}
                    </div>
                )}
            </div>
        </div>
    );
};
