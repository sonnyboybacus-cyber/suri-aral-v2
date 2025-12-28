
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { UserRole, Announcement } from '../types';
import { createAnnouncement, updateAnnouncement, deleteAnnouncement, subscribeToAnnouncements, logActivity, sendNotification } from '../services/databaseService';
import { MegaphoneIcon, PlusIcon, EditIcon, TrashIcon, XIcon, SaveIcon, SpinnerIcon, CalendarIcon, ClockIcon } from './icons';

interface AnnouncementsProps {
    user: firebase.User;
    role: UserRole;
}

// Helper to render text with clickable links
const RichTextRenderer = ({ text }: { text: string }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return (
        <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base">
            {parts.map((part, i) => 
                part.match(urlRegex) ? (
                    <a 
                        key={i} 
                        href={part} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline break-all"
                    >
                        {part}
                    </a>
                ) : (
                    part
                )
            )}
        </p>
    );
};

export const Announcements = ({ user, role }: AnnouncementsProps) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form State
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    
    // Delete Modal State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Restrict actions to Admin only
    const hasPermission = role === 'admin';

    useEffect(() => {
        const unsubscribe = subscribeToAnnouncements((data) => {
            setAnnouncements(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!hasPermission) {
            alert("Permission Denied: Only administrators can post announcements.");
            return;
        }

        if (!title.trim() || !content.trim()) {
            alert("Title and Content are required.");
            return;
        }

        setIsSaving(true);
        try {
            // STRICT TEXT-ONLY PAYLOAD
            const data = {
                title: title.trim(),
                content: content.trim(),
                date: Date.now(),
                authorName: user.displayName || user.email || 'Unknown',
                authorId: user.uid
            };

            if (currentId) {
                await updateAnnouncement(currentId, data);
                await logActivity(user.uid, user.displayName || 'Unknown', 'update', 'Announcements', `Updated announcement: ${title}`);
                sendNotification(user.uid, {
                    title: 'Announcement Updated',
                    message: `Successfully updated post: ${title}`,
                    type: 'success',
                    link: 'announcements'
                });
            } else {
                await createAnnouncement(data);
                await logActivity(user.uid, user.displayName || 'Unknown', 'create', 'Announcements', `Created announcement: ${title}`);
                sendNotification(user.uid, {
                    title: 'Announcement Posted',
                    message: `Successfully published: ${title}`,
                    type: 'success',
                    link: 'announcements'
                });
            }
            closeForm();
        } catch (error: any) {
            console.error("Announcement Error:", error);
            if (error.code === 'PERMISSION_DENIED' || error.message?.includes('PERMISSION_DENIED')) {
                alert("Permission Denied: The database rejected this request. Please ensure you are an Admin.");
            } else {
                alert("Failed to save announcement. Please try again.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (announcement: Announcement) => {
        if (!hasPermission) return;
        setCurrentId(announcement.id);
        setTitle(announcement.title);
        setContent(announcement.content);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId || !hasPermission) return;
        try {
            await deleteAnnouncement(deleteId);
            await logActivity(user.uid, user.displayName || 'Unknown', 'delete', 'Announcements', `Deleted announcement ID: ${deleteId}`);
            sendNotification(user.uid, {
                title: 'Announcement Deleted',
                message: 'Post was removed successfully.',
                type: 'info'
            });
            setDeleteId(null);
        } catch (error: any) {
            console.error(error);
            alert("Failed to delete announcement.");
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setCurrentId(null);
        setTitle('');
        setContent('');
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60); // hours
        
        if (diff < 24) {
            return `${Math.max(1, Math.floor(diff))} HRS AGO`;
        }
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Announcements
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm tracking-wide uppercase font-medium">
                        School Updates & Memoranda
                    </p>
                </div>
                {hasPermission && (
                    <button 
                        onClick={() => setIsFormOpen(true)}
                        className="flex items-center px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm"
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        New Post
                    </button>
                )}
            </header>

            {isLoading ? (
                <div className="flex justify-center p-20">
                    <SpinnerIcon className="w-8 h-8 animate-spin text-slate-300" />
                </div>
            ) : announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 border-dashed">
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mb-6">
                        <MegaphoneIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-lg font-serif font-medium text-slate-700 dark:text-slate-300">All caught up</h3>
                    <p className="text-slate-400 text-sm mt-1">No new announcements to display.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {announcements.map(ann => (
                        <article 
                            key={ann.id} 
                            className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-300 border border-slate-100 dark:border-slate-700 relative group"
                        >
                            {hasPermission && (
                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleEdit(ann)} 
                                        className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 rounded-full transition-colors"
                                        title="Edit"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setDeleteId(ann.id)} 
                                        className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-700 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <header className="mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-md">
                                        <CalendarIcon className="w-3 h-3 mr-1.5" />
                                        {formatDate(ann.date)}
                                    </span>
                                    <span className="text-[10px] font-bold tracking-widest text-indigo-500 uppercase border border-indigo-100 dark:border-indigo-900 px-2 py-1 rounded-md">
                                        {ann.authorName || 'SYSTEM'}
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                    {ann.title}
                                </h2>
                            </header>

                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <RichTextRenderer text={ann.content} />
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* CREATE/EDIT MODAL */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fade-in-up">
                        <header className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-xl font-serif font-bold text-slate-800 dark:text-white">
                                {currentId ? 'Edit Announcement' : 'New Announcement'}
                            </h2>
                            <button onClick={closeForm} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </header>
                        
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Headline</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)} 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-serif text-lg placeholder-slate-400"
                                    placeholder="e.g. Changes to Examination Schedule"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Content <span className="text-indigo-500 normal-case font-normal ml-1">(Hyperlinks are auto-detected)</span>
                                </label>
                                <textarea 
                                    value={content} 
                                    onChange={e => setContent(e.target.value)} 
                                    className="w-full p-4 h-64 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all resize-none leading-relaxed"
                                    placeholder="Type your message here. You can paste links to documents (Google Drive, PDF, etc.) directly into the text."
                                    required
                                />
                            </div>
                        </form>

                        <footer className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl">
                            <button 
                                onClick={closeForm} 
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSaving} 
                                className="flex items-center px-6 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none"
                            >
                                {isSaving ? <SpinnerIcon className="w-4 h-4 animate-spin mr-2" /> : <SaveIcon className="w-4 h-4 mr-2" />}
                                {isSaving ? 'Posting...' : 'Publish Post'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <TrashIcon className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-2">Delete Post?</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                            This action cannot be undone. The announcement will be permanently removed for all users.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={() => setDeleteId(null)} 
                                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete} 
                                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm shadow-md transition-colors"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
