// =========================================================================
// USE QUESTION BANK HOOK
// =========================================================================

import { useState, useEffect, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import { Question, QuestionBank, ImportFormat, CognitiveLevel, DifficultyLevel } from '../../types/questionBank';
import { UserProfile } from '../../types/core';
import { Subject } from '../../types';
import {
    loadQuestionBanks,
    loadQuestionBank,
    createQuestionBank,
    updateQuestionBank,
    deleteQuestionBank,
    loadQuestions,
    loadQuestionsByFilters,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    parseQuestionImport,
    bulkImportQuestions,
    loadSubjects,
    // loadCompetencies, // Removed for Cleanup
    loadUserProfile
} from '../../services/databaseService';
// import { DepEdCompetency } from '../../types/questionBank'; // Removed
import { solveQuestion } from '../../services/ai/questionBankService';

interface Filters {
    subject?: string;
    gradeLevel?: string;
    searchText?: string;
}

export const useQuestionBank = (user: firebase.User) => {
    // State
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [banks, setBanks] = useState<QuestionBank[]>([]);
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    // const [competencies, setCompetencies] = useState<DepEdCompetency[]>([]); // Removed
    const [filters, setFilters] = useState<Filters>({});
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

    // Load banks on mount
    useEffect(() => {
        const fetchBanks = async () => {
            setIsLoading(true);
            try {
                const loadedBanks = await loadQuestionBanks(user.uid);
                setBanks(loadedBanks);
            } catch (e) {
                // If no data exists yet or permission denied, just show empty list
                console.warn('Could not load question banks:', e);
                setBanks([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBanks();
    }, [user.uid]);

    // Selected bank details
    const selectedBank = banks.find(b => b.id === selectedBankId) || null;

    // Load questions AND competencies when bank is selected
    useEffect(() => {
        if (!selectedBankId) {
            setQuestions([]);
            // setCompetencies([]); // Removed
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Load Questions
                const loadedQuestions = Object.keys(filters).length > 0
                    ? await loadQuestionsByFilters(selectedBankId, filters)
                    : await loadQuestions(selectedBankId);
                setQuestions(loadedQuestions);

            } catch (e) {
                setError('Failed to load bank data');
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedBankId, filters, selectedBank?.subject, selectedBank?.gradeLevel]); // Depend on subject/grade too

    // Actions
    const handleCreateBank = useCallback(async (data: {
        name: string;
        subject: string;
        gradeLevel: string;
        schoolYear: string;
        description?: string;
        isShared: boolean;
        createdByName?: string;
    }) => {
        setIsSaving(true);
        try {
            const id = await createQuestionBank({
                ...data,
                createdBy: user.uid,
                createdByName: user.displayName || 'Teacher'
            });
            const newBank = await loadQuestionBank(id);
            if (newBank) {
                setBanks(prev => [...prev, newBank]);
                setSelectedBankId(id);
            }
            return id;
        } catch (e) {
            console.error(e);
            const message = (e as any)?.message || 'Unknown error occurred';
            setError(`Failed to create question bank: ${message}`);
            throw e;
        } finally {
            setIsSaving(false);
        }
    }, [user.uid]);

    const handleDeleteBank = useCallback(async (bankId: string) => {
        if (!confirm('Are you sure you want to delete this question bank? All questions will be permanently deleted.')) {
            return;
        }
        setIsSaving(true);
        try {
            await deleteQuestionBank(bankId);
            setBanks(prev => prev.filter(b => b.id !== bankId));
            if (selectedBankId === bankId) {
                setSelectedBankId(null);
            }
        } catch (e) {
            setError('Failed to delete question bank');
        } finally {
            setIsSaving(false);
        }
    }, [selectedBankId]);

    const handleAddQuestion = useCallback(async (question: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'timesUsed'>) => {
        if (!selectedBankId) {
            setError('No bank selected');
            return;
        }
        setIsSaving(true);
        try {
            const id = await addQuestion(selectedBankId, question);
            const updatedQuestions = await loadQuestions(selectedBankId);
            setQuestions(updatedQuestions);

            // Update bank question count
            setBanks(prev => prev.map(b =>
                b.id === selectedBankId
                    ? { ...b, questionCount: (b.questionCount || 0) + 1 }
                    : b
            ));
            return id;
        } catch (e: any) {
            console.error("Add Question Error:", e);
            setError(`Failed to add question: ${e.message}`);
            throw e;
        } finally {
            setIsSaving(false);
        }
    }, [selectedBankId]);

    const handleUpdateQuestion = useCallback(async (questionId: string, updates: Partial<Question>) => {
        if (!selectedBankId) return;
        setIsSaving(true);
        try {
            await updateQuestion(selectedBankId, questionId, updates);
            setQuestions(prev => prev.map(q =>
                q.id === questionId ? { ...q, ...updates } : q
            ));
        } catch (e: any) {
            console.error("Update Question Error:", e);
            setError(`Failed to update question: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [selectedBankId]);

    const handleDeleteQuestion = useCallback(async (questionId: string) => {
        if (!selectedBankId) return;
        if (!confirm('Delete this question?')) return;

        setIsSaving(true);
        try {
            await deleteQuestion(selectedBankId, questionId);
            setQuestions(prev => prev.filter(q => q.id !== questionId));
            setBanks(prev => prev.map(b =>
                b.id === selectedBankId && b.questionCount > 0
                    ? { ...b, questionCount: b.questionCount - 1 }
                    : b
            ));
        } catch (e: any) {
            console.error("Add Question Error:", e);
            setError(`Failed to add question: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [selectedBankId]);

    const handleBulkImport = useCallback(async (
        text: string,
        format: ImportFormat,
        defaultMetadata: { subject: string; gradeLevel: string }
    ) => {
        if (!selectedBankId) {
            setError('No bank selected');
            return { success: 0, failed: 0, errors: [] };
        }

        setIsSaving(true);
        try {
            const parseResult = parseQuestionImport(text, format);

            if (!parseResult.success || parseResult.questions.length === 0) {
                return { success: 0, failed: 0, errors: parseResult.errors };
            }

            const importResult = await bulkImportQuestions(
                selectedBankId,
                parseResult.questions,
                { ...defaultMetadata, createdBy: user.uid }
            );

            // Reload questions
            const updatedQuestions = await loadQuestions(selectedBankId);
            setQuestions(updatedQuestions);

            // Update bank count
            const bank = await loadQuestionBank(selectedBankId);
            if (bank) {
                setBanks(prev => prev.map(b =>
                    b.id === selectedBankId ? { ...b, questionCount: bank.questionCount } : b
                ));
            }

            return { ...importResult, errors: parseResult.errors };
        } catch (e) {
            setError('Failed to import questions');
            return { success: 0, failed: 0, errors: ['Import failed'] };
        } finally {
            setIsSaving(false);
        }
    }, [selectedBankId, user.uid]);

    // AI Helper
    const handleAISolve = useCallback(async (question: string, options?: string[], type?: any) => {
        try {
            return await solveQuestion(question, options, type);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, []);

    const handleFilterChange = useCallback((newFilters: Filters) => {
        setFilters(newFilters);
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const canEdit = selectedBank?.createdBy === user.uid || userProfile?.role === 'admin';

    return {
        // State
        banks,
        selectedBankId,
        selectedBank,
        questions,
        // competencies, // Removed
        filters,
        isLoading,
        isSaving,
        error,
        canEdit,
        subjects,
        schoolYears,

        // Actions
        setSelectedBankId,
        handleCreateBank,
        handleDeleteBank,
        handleAddQuestion,
        handleUpdateQuestion,
        handleDeleteQuestion,
        handleBulkImport,
        handleAISolve, // Export AI solver
        handleFilterChange,
        clearError
    };
};
