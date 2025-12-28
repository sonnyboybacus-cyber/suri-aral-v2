
import React, { useState, useEffect, useContext } from 'react';
import { ManagedResource } from '../types';
import { getAccessibleResources } from '../services/db/resources';
import { FolderIcon, FileTextIcon, SpinnerIcon, SchoolIcon, ArrowUpRightIcon } from './icons';
import { UserContext } from '../contexts/UserContext';
import { View } from '../types';

interface ResourceWidgetProps {
    setActiveView: (view: View) => void;
}

export const ResourceWidget = ({ setActiveView }: ResourceWidgetProps) => {
    const { user, role, userProfile } = useContext(UserContext);
    const [resources, setResources] = useState<ManagedResource[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResources = async () => {
            if (user && role) {
                try {
                    setLoading(true);
                    // Fetch all, then slice locally since we don't have limit query yet in service
                    // Ideally service should support limit, but for now this is fine for small datasets
                    const data = await getAccessibleResources(role, user.uid, userProfile?.schoolId);
                    // Sort by createdAt desc
                    const sorted = data.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
                    setResources(sorted);
                } catch (error) {
                    console.error("Failed to load widget resources", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchResources();
    }, [user, role, userProfile?.schoolId]);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                    <FolderIcon className="w-5 h-5 text-indigo-500" />
                    Resources
                </h3>
                <button
                    onClick={() => setActiveView('resources')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                >
                    View All <ArrowUpRightIcon className="w-3 h-3 ml-1" />
                </button>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <SpinnerIcon className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                ) : resources.length > 0 ? (
                    resources.map(res => (
                        <a
                            key={res.id}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-all group"
                        >
                            <div className={`p-2 rounded-lg mr-3 ${res.type === 'file' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                                {res.type === 'file' ? <FolderIcon className="w-4 h-4" /> : <FileTextIcon className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                                    {res.title}
                                </h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {res.description || 'No description'}
                                </p>
                            </div>
                        </a>
                    ))
                ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                        No recent resources
                    </div>
                )}
            </div>
        </div>
    );
};
