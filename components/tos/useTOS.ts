// =========================================================================
// USE TOS HOOK
// =========================================================================

import { useState, useEffect, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import { TOS, TOSEntry, DepEdCompetency, CognitiveLevel } from '../../types/questionBank';
import { Subject } from '../../types';
import {
    loadTOSList,
    loadTOS,
    createTOS,
    updateTOS,
    deleteTOS,
    addTOSEntry,
    updateTOSEntry,
    deleteTOSEntry,
    loadCompetencies,
    addCompetency, // Import this
    calculateTOSStats,
    assignItemPlacements,
    loadSubjects,
    loadUserProfile,
    bulkImportQuestions,
    loadQuestionBanks,
    createQuestionBank
} from '../../services/databaseService';
import { UserProfile } from '../../types/core';
import { getSmartMatches } from '../../services/tosMatchingService';
import { generateQuestionsForCompetency } from '../../services/ai/questionBankService';
import { Question, QuestionBank } from '../../types/questionBank';

export const useTOS = (user: firebase.User) => {
    // State
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [tosList, setTosList] = useState<TOS[]>([]);
    const [selectedTOSId, setSelectedTOSId] = useState<string | null>(null);
    const [currentTOS, setCurrentTOS] = useState<TOS | null>(null);
    const [competencies, setCompetencies] = useState<DepEdCompetency[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Lookup data
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [schoolYears, setSchoolYears] = useState<string[]>([]);

    // Generate school years (current year and 4 years back/forward)
    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const years: string[] = [];
        for (let i = -2; i <= 2; i++) {
            const startYear = currentYear + i;
            years.push(`${startYear}-${startYear + 1}`);
        }
        setSchoolYears(years);
    }, []);

    // Load subjects on mount
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const loadedSubjects = await loadSubjects();
                setSubjects(loadedSubjects);
            } catch (e) {
                console.warn('Could not load subjects:', e);
                setSubjects([]);
            }
        };
        const fetchProfile = async () => {
            try {
                const profile = await loadUserProfile(user.uid);
                setUserProfile(profile);
            } catch (e) {
                console.warn('Could not load user profile:', e);
            }
        };
        fetchSubjects();
        fetchProfile();
    }, [user.uid]);

    // Load TOS list on mount
    useEffect(() => {
        const fetchTOSList = async () => {
            setIsLoading(true);
            try {
                const list = await loadTOSList(user.uid);
                setTosList(list);
            } catch (e) {
                // If no data exists yet or permission denied, just show empty list
                console.warn('Could not load TOS list:', e);
                setTosList([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTOSList();
    }, [user.uid]);

    // Load selected TOS details
    useEffect(() => {
        if (!selectedTOSId) {
            setCurrentTOS(null);
            return;
        }

        const fetchTOS = async () => {
            setIsLoading(true);
            try {
                const tos = await loadTOS(selectedTOSId);
                setCurrentTOS(tos);
            } catch (e) {
                setError('Failed to load TOS');
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTOS();
    }, [selectedTOSId]);

    // Load competencies for filtering
    const loadCompetenciesForFilters = useCallback(async (filters: {
        subject?: string;
        gradeLevel?: string;
        quarter?: string;
    }) => {
        try {
            const comps = await loadCompetencies(filters);
            setCompetencies(comps);
        } catch (e) {
            console.error('Failed to load competencies', e);
        }
    }, []);

    // Actions
    const handleCreateTOS = useCallback(async (data: {
        title: string;
        subject: string;
        gradeLevel: string;
        quarter: string;
        schoolYear: string;
        isShared: boolean;
    }) => {
        setIsSaving(true);
        try {
            const id = await createTOS({
                ...data,
                totalItems: 0,
                entries: [],
                createdBy: user.uid,
                createdByName: user.displayName || 'Unknown'
            });
            const newTOS = await loadTOS(id);
            if (newTOS) {
                setTosList(prev => [...prev, newTOS]);
                setSelectedTOSId(id);
            }
            return id;
        } catch (e) {
            console.error(e);
            const message = (e as any)?.message || 'Unknown error occurred';
            setError(`Failed to create TOS: ${message}`);
            throw e;
        } finally {
            setIsSaving(false);
        }
    }, [user.uid]);

    const handleUpdateTOS = useCallback(async (updates: Partial<TOS>) => {
        if (!selectedTOSId) return;
        setIsSaving(true);
        try {
            await updateTOS(selectedTOSId, updates);
            setCurrentTOS(prev => prev ? { ...prev, ...updates } : null);
            setTosList(prev => prev.map(t =>
                t.id === selectedTOSId ? { ...t, ...updates } : t
            ));
        } catch (e) {
            setError('Failed to update TOS');
        } finally {
            setIsSaving(false);
        }
    }, [selectedTOSId]);

    const handleDeleteTOS = useCallback(async (tosId: string) => {
        if (!confirm('Delete this TOS template?')) return;
        setIsSaving(true);
        try {
            await deleteTOS(tosId);
            setTosList(prev => prev.filter(t => t.id !== tosId));
            if (selectedTOSId === tosId) {
                setSelectedTOSId(null);
            }
        } catch (e) {
            setError('Failed to delete TOS');
        } finally {
            setIsSaving(false);
        }
    }, [selectedTOSId]);

    const handleAddEntry = useCallback(async (entry: Omit<TOSEntry, 'id'>) => {
        if (!selectedTOSId) return;
        setIsSaving(true);
        try {
            await addTOSEntry(selectedTOSId, entry);

            // AUTO-SAVE NEW COMPETENCIES to Library
            try {
                // Use currentTOS (closure) or rely on the fact it's available in scope if we add it to deps?
                // currentTOS is in scope but might be stale if not in deps. 
                // Better to reload TOS first or use local variable if we trust state. 
                // We need currentTOS for subject/grade/quarter.
                // Let's assume currentTOS is up to date enough for metadata.

                if (currentTOS && entry.competencyCode) {
                    const exists = competencies.some(c => c.code === entry.competencyCode);
                    if (!exists) {
                        const newComp: DepEdCompetency = {
                            code: entry.competencyCode,
                            learningCompetency: entry.learningCompetency,
                            subject: currentTOS.subject,
                            gradeLevel: currentTOS.gradeLevel,
                            quarter: currentTOS.quarter,
                            suggestedCognitiveLevel: entry.cognitiveLevel,
                            contentStandard: entry.contentStandard || '',
                            performanceStandard: entry.performanceStandard || ''
                        };

                        // 1. Save to DB
                        await addCompetency(newComp);

                        // 2. Update local state
                        setCompetencies(prev => [...prev, newComp]);
                    }
                }
            } catch (autoSaveError) {
                console.warn("Failed to auto-save competency:", autoSaveError);
                // We do NOT re-throw here, so the main entry addition is still considered successful
            }

            // Reload TOS to get updated entries
            const updated = await loadTOS(selectedTOSId);
            setCurrentTOS(updated);
            if (updated) {
                setTosList(prev => prev.map(t =>
                    t.id === selectedTOSId ? updated : t
                ));
            }
        } catch (e) {
            setError('Failed to add entry');
        } finally {
            setIsSaving(false);
        }
    }, [selectedTOSId, currentTOS, competencies]); // Added currentTOS and competencies to deps

    const handleUpdateEntry = useCallback(async (entryId: string, updates: Partial<TOSEntry>) => {
        if (!selectedTOSId) return;
        setIsSaving(true);
        try {
            await updateTOSEntry(selectedTOSId, entryId, updates);
            const updated = await loadTOS(selectedTOSId);
            setCurrentTOS(updated);
        } catch (e) {
            setError('Failed to update entry');
        } finally {
            setIsSaving(false);
        }
    }, [selectedTOSId]);

    const handleDeleteEntry = useCallback(async (entryId: string) => {
        if (!selectedTOSId) return;
        setIsSaving(true);
        try {
            await deleteTOSEntry(selectedTOSId, entryId);
            const updated = await loadTOS(selectedTOSId);
            setCurrentTOS(updated);
        } catch (e) {
            setError('Failed to delete entry');
        } finally {
            setIsSaving(false);
        }
    }, [selectedTOSId]);

    const handleAutoAssignPlacements = useCallback(async () => {
        if (!currentTOS) return;
        const updatedEntries = assignItemPlacements(currentTOS.entries);
        await handleUpdateTOS({ entries: updatedEntries });
    }, [currentTOS, handleUpdateTOS]);

    const handleAllocateQuestions = useCallback(async (entryId: string, questionIds: string[]) => {
        if (!selectedTOSId) return;
        setIsSaving(true);
        try {
            await updateTOSEntry(selectedTOSId, entryId, { allocatedQuestionIds: questionIds });
            // Optimistic update
            setCurrentTOS(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    entries: prev.entries.map(e => e.id === entryId ? { ...e, allocatedQuestionIds: questionIds } : e)
                };
            });
        } catch (e) {
            console.error(e);
            setError('Failed to allocate questions');
        } finally {
            setIsSaving(false);
        }
    }, [selectedTOSId]);

    const handleSmartAllocate = useCallback(async (entry: TOSEntry, allQuestions: Question[]) => {
        if (!selectedTOSId || !currentTOS) return 0;

        // Collect ALL currently allocated IDs to avoid duplicates across entries
        const allAllocatedIds = currentTOS.entries.flatMap(e => e.allocatedQuestionIds || []);

        const matchedIds = getSmartMatches(entry, allQuestions, allAllocatedIds);

        if (matchedIds.length > 0) {
            // Combine with existing allocation for this entry (if we want to append)
            // Or replace? Usually "Smart Fill" implies filling the gaps. 
            // The service returns ONLY the new IDs needed to fill the gap.
            // So we strictly append.
            const newAllocation = [...(entry.allocatedQuestionIds || []), ...matchedIds];
            await handleAllocateQuestions(entry.id, newAllocation);
            return matchedIds.length;
        }
        return 0;
    }, [selectedTOSId, currentTOS, handleAllocateQuestions]);

    const handleGenerateQuestions = useCallback(async (entry: TOSEntry, bankId?: string) => {
        if (!selectedTOSId || !currentTOS) return 0;
        setIsSaving(true);
        try {
            // 1. Determine Target Bank
            let targetBankId = bankId;
            if (!targetBankId) {
                // Try to find "AI Questions" bank or create it
                const allBanks = await loadQuestionBanks(user.uid); // We load here to be safe
                const aiBank = allBanks.find(b => b.name === 'AI Generated Questions' && b.createdBy === user.uid);
                if (aiBank) {
                    targetBankId = aiBank.id;
                } else {
                    targetBankId = await createQuestionBank({
                        name: 'AI Generated Questions',
                        subject: currentTOS.subject,
                        gradeLevel: currentTOS.gradeLevel,
                        description: 'Automatically generated questions from TOS',
                        createdBy: user.uid,
                        schoolYear: currentTOS.schoolYear,
                        isShared: false
                    });
                }
            } // End of Bank Check

            // 2. Generate Questions
            const generated = await generateQuestionsForCompetency(
                entry.competencyCode,
                entry.learningCompetency,
                entry.cognitiveLevel,
                currentTOS.subject,
                currentTOS.gradeLevel,
                entry.numberOfItems - (entry.allocatedQuestionIds?.length || 0) // Generate only what's needed
            );

            if (generated.length === 0) return 0;

            // 3. Save to Bank
            const result = await bulkImportQuestions(targetBankId, generated.map(g => ({
                ...g,
                subject: currentTOS.subject,
                gradeLevel: currentTOS.gradeLevel,
                competencyCode: entry.competencyCode,
                learningCompetency: entry.learningCompetency,
                cognitiveLevel: entry.cognitiveLevel, // Force match
                difficultyLevel: g.difficultyLevel as any || 'Average',
                tags: ['AI-Generated', 'TOS-Auto-Fill']
            })), {
                subject: currentTOS.subject,
                gradeLevel: currentTOS.gradeLevel,
                createdBy: user.uid
            });

            // 4. Allocate to Entry
            const newAllocation = [...(entry.allocatedQuestionIds || []), ...result.questionIds];
            await handleAllocateQuestions(entry.id, newAllocation);

            return result.success;
        } catch (e) {
            console.error("Auto-Generate Error:", e);
            setError('Failed to generate questions. Please try again.');
            return 0;
        } finally {
            setIsSaving(false);
        }
    }, [selectedTOSId, currentTOS, user.uid, handleAllocateQuestions]);

    const clearError = useCallback(() => setError(null), []);

    // Computed
    const canEdit = currentTOS?.createdBy === user.uid || userProfile?.role === 'admin';

    // --- Safe Calc Stats ---
    const stats = currentTOS ? calculateTOSStats(currentTOS.entries || []) : null;

    return {
        // State
        tosList,
        selectedTOSId,
        currentTOS,
        competencies,
        isLoading,
        isSaving,
        error,
        canEdit,
        stats,
        subjects,
        schoolYears,

        // Actions
        setSelectedTOSId,
        handleCreateTOS,
        handleUpdateTOS,
        handleDeleteTOS,
        handleAddEntry,
        handleUpdateEntry,
        handleDeleteEntry,
        handleAutoAssignPlacements,
        handleAllocateQuestions,
        handleSmartAllocate,
        handleGenerateQuestions,
        loadCompetenciesForFilters,
        clearError
    };
};
