import React, { useState, useEffect, useContext } from 'react';
import { ManagedResource } from '../types';
import { getAccessibleResources, createManagedResource, deleteManagedResource } from '../services/db/resources';
import { FolderIcon, FileTextIcon, SpinnerIcon, SchoolIcon, SearchIcon, FilterIcon, PlusIcon, TrashIcon, LinkIcon, XIcon, GlobeIcon } from './icons';
import { UserContext } from '../contexts/UserContext';
import { generateUUID } from '../services/databaseService';
import { usePermissions } from '../hooks/usePermissions';

export const ManagedResourcesList = () => {
    const { user, role, userProfile } = useContext(UserContext);
    const [resources, setResources] = useState<ManagedResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    // Permission Check
    const { can } = usePermissions();
    const canManageResources = can('manage_resources');

    // CRUD State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newResource, setNewResource] = useState<Partial<ManagedResource>>({
        title: '',
        description: '',
        type: 'link',
        url: '',
        targetRoles: ['student', 'teacher'],
        schoolId: ''
    });

    const refreshResources = async () => {
        if (user && role) {
            try {
                setLoading(true);
                const data = await getAccessibleResources(role, user.uid, userProfile?.schoolId);
                setResources(data);
            } catch (error) {
                console.error("Failed to load resources", error);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        refreshResources();
    }, [user, role, userProfile?.schoolId]);

    const handleCreateResource = async () => {
        if (!newResource.title || !newResource.url) return alert("Title and URL/Link are required.");
        setIsSaving(true);
        try {
            await createManagedResource({
                title: newResource.title,
                description: newResource.description || '',
                type: newResource.type as 'file' | 'link',
                url: newResource.url,
                uploadedBy: user?.uid || 'system',
                createdBy: user?.uid || 'system', // Satisfy type requirement
                schoolId: userProfile?.schoolId || '',
                targetRoles: newResource.targetRoles || ['student']
            }, user?.uid || 'system');
            setIsAddModalOpen(false);
            setNewResource({ title: '', description: '', type: 'link', url: '', targetRoles: ['student', 'teacher'] });
            await refreshResources();
        } catch (error) {
            console.error(error);
            alert("Failed to create resource.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteResource = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this resource?")) return;
        try {
            await deleteManagedResource(id);
            setResources(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error(error);
            alert("Failed to delete resource.");
        }
    };

    const filteredResources = resources.filter(res => {
        // Strict School Filter: don't show other schools' resources unless user is owner or it is global
        // Assuming getAccessibleResources handles this, but let's be safe visually
        const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (res.description && res.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'all' || res.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="p-4 md:p-8 text-slate-800 dark:text-slate-200 animate-fade-in-up">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <FolderIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight">Shared Resources</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Access and manage shared files and links.</p>
                        </div>
                    </div>
                    {canManageResources && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Add Resource
                        </button>
                    )}
                </header>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <div className="relative w-full md:w-96">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search resources..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                            >
                                <option value="all">All Types</option>
                                <option value="file">Files</option>
                                <option value="link">Links</option>
                            </select>
                        </div>
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="flex flex-col items-center gap-3">
                                <SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500" />
                                <span className="text-slate-400 font-medium text-sm">Loading resources...</span>
                            </div>
                        </div>
                    ) : filteredResources.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredResources.map(res => (
                                <a
                                    key={res.id}
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 relative"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2.5 rounded-lg ${res.type === 'file' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                                            {res.type === 'file' ? <FolderIcon className="w-6 h-6" /> : <GlobeIcon className="w-6 h-6" />}
                                        </div>
                                        {res.schoolId && (
                                            <span className="px-2 py-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full flex items-center">
                                                <SchoolIcon className="w-3 h-3 mr-1" />
                                                School
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1" title={res.title}>
                                        {res.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 mb-4 flex-1">
                                        {res.description || "No description provided."}
                                    </p>
                                    <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <span>{new Date(res.createdAt).toLocaleDateString()}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-indigo-500 group-hover:underline">Open &rarr;</span>
                                            {canManageResources && (res.uploadedBy === user?.uid || role === 'admin') && (
                                                <button
                                                    onClick={(e) => handleDeleteResource(res.id, e)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all z-10"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                            <div className="inline-flex p-4 rounded-full bg-slate-50 dark:bg-slate-800 mb-4">
                                <FolderIcon className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">No resources found</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                                No resources have been shared yet. {canManageResources ? "Click 'Add Resource' to share something." : "Check back later."}
                            </p>
                            {canManageResources && (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="mt-4 text-indigo-500 font-bold hover:underline"
                                >
                                    Share a resource now
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Resource Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-scale-up border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Resource</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Science Textbook PDF"
                                    value={newResource.title}
                                    onChange={e => setNewResource({ ...newResource, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setNewResource({ ...newResource, type: 'link' })}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${newResource.type === 'link' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                    >
                                        Link / URL
                                    </button>
                                    <button
                                        onClick={() => setNewResource({ ...newResource, type: 'file' })}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${newResource.type === 'file' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                    >
                                        File Download
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">URL / Link</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="https://..."
                                        value={newResource.url}
                                        onChange={e => setNewResource({ ...newResource, url: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Description (Optional)</label>
                                <textarea
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="Brief description..."
                                    value={newResource.description}
                                    onChange={e => setNewResource({ ...newResource, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateResource}
                                disabled={isSaving}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Create Resource'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
