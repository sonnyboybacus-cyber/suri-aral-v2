// =========================================================================
// QUESTION BANK DATABASE SERVICE
// =========================================================================

import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { Question, QuestionBank, ImportResult, ImportFormat } from '../../types/questionBank';
import { parseSnapshot, generateUUID } from './core';

// ---------------------------------------------------------------------------
// REFS
// ---------------------------------------------------------------------------

const getQuestionBanksRef = () => db.ref('question_banks');
const getQuestionsRef = (bankId: string) => db.ref(`questions/${bankId}`);

// ---------------------------------------------------------------------------
// QUESTION BANK CRUD
// ---------------------------------------------------------------------------

export const createQuestionBank = async (bank: Omit<QuestionBank, 'id' | 'createdAt' | 'updatedAt' | 'questionCount'>): Promise<string> => {
    const id = generateUUID();
    const now = Date.now();
    const newBank: QuestionBank = {
        ...bank,
        id,
        questionCount: 0,
        createdAt: now,
        updatedAt: now
    };
    await getQuestionBanksRef().child(id).set(newBank);
    return id;
};

export const loadQuestionBanks = async (userId: string): Promise<QuestionBank[]> => {
    const snapshot = await getQuestionBanksRef().once('value');
    const banks = parseSnapshot<QuestionBank>(snapshot);

    // Return ALL banks (Global View)
    return banks;
};

export const loadQuestionBank = async (bankId: string): Promise<QuestionBank | null> => {
    const snapshot = await getQuestionBanksRef().child(bankId).once('value');
    return snapshot.exists() ? snapshot.val() as QuestionBank : null;
};

export const updateQuestionBank = async (bankId: string, updates: Partial<QuestionBank>): Promise<void> => {
    await getQuestionBanksRef().child(bankId).update({
        ...updates,
        updatedAt: Date.now()
    });
};

export const deleteQuestionBank = async (bankId: string): Promise<void> => {
    // Delete bank metadata
    await getQuestionBanksRef().child(bankId).remove();
    // Delete all questions in the bank
    await getQuestionsRef(bankId).remove();
};

// ---------------------------------------------------------------------------
// QUESTION CRUD
// ---------------------------------------------------------------------------

export const addQuestion = async (bankId: string, question: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'timesUsed'>): Promise<string> => {
    const id = generateUUID();
    const now = Date.now();
    const newQuestion: Question = {
        ...question,
        id,
        createdAt: now,
        updatedAt: now,
        timesUsed: 0
    };

    await getQuestionsRef(bankId).child(id).set(newQuestion);

    // Update question count in bank
    const bank = await loadQuestionBank(bankId);
    if (bank) {
        await updateQuestionBank(bankId, { questionCount: (bank.questionCount || 0) + 1 });
    }

    return id;
};

export const loadQuestions = async (bankId: string): Promise<Question[]> => {
    const snapshot = await getQuestionsRef(bankId).once('value');
    return parseSnapshot<Question>(snapshot);
};

export const loadQuestionsByCompetency = async (bankId: string, competencyCode: string): Promise<Question[]> => {
    const questions = await loadQuestions(bankId);
    return questions.filter(q => q.competencyCode === competencyCode);
};

export const loadQuestionsByFilters = async (
    bankId: string,
    filters: {
        subject?: string;
        gradeLevel?: string;
        cognitiveLevel?: string;
        difficultyLevel?: string;
        searchText?: string;
    }
): Promise<Question[]> => {
    let questions = await loadQuestions(bankId);

    if (filters.subject) {
        questions = questions.filter(q => q.subject === filters.subject);
    }
    if (filters.gradeLevel) {
        questions = questions.filter(q => q.gradeLevel === filters.gradeLevel);
    }
    if (filters.cognitiveLevel) {
        questions = questions.filter(q => q.cognitiveLevel === filters.cognitiveLevel);
    }
    if (filters.difficultyLevel) {
        questions = questions.filter(q => q.difficultyLevel === filters.difficultyLevel);
    }
    if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        questions = questions.filter(q =>
            q.questionText.toLowerCase().includes(search) ||
            q.learningCompetency.toLowerCase().includes(search) ||
            q.competencyCode.toLowerCase().includes(search)
        );
    }

    return questions;
};

export const updateQuestion = async (bankId: string, questionId: string, updates: Partial<Question>): Promise<void> => {
    await getQuestionsRef(bankId).child(questionId).update({
        ...updates,
        updatedAt: Date.now()
    });
};

export const deleteQuestion = async (bankId: string, questionId: string): Promise<void> => {
    await getQuestionsRef(bankId).child(questionId).remove();

    // Update question count in bank
    const bank = await loadQuestionBank(bankId);
    if (bank && bank.questionCount > 0) {
        await updateQuestionBank(bankId, { questionCount: bank.questionCount - 1 });
    }
};

export const incrementQuestionUsage = async (bankId: string, questionId: string): Promise<void> => {
    const ref = getQuestionsRef(bankId).child(questionId).child('timesUsed');
    await ref.transaction((current: number) => (current || 0) + 1);
};

// ---------------------------------------------------------------------------
// BULK IMPORT
// ---------------------------------------------------------------------------

export const parseQuestionImport = (text: string, format: ImportFormat): ImportResult => {
    const result: ImportResult = {
        success: false,
        imported: 0,
        failed: 0,
        errors: [],
        questions: []
    };

    try {
        if (format === 'numbered') {
            result.questions = parseNumberedFormat(text, result.errors);
        } else if (format === 'tabular') {
            result.questions = parseTabularFormat(text, result.errors);
        } else if (format === 'json') {
            result.questions = parseJSONFormat(text, result.errors);
        }

        result.imported = result.questions.length;
        result.failed = result.errors.length;
        result.success = result.imported > 0;
    } catch (e) {
        result.errors.push(`Parse error: ${(e as Error).message}`);
    }

    return result;
};

// Parse: 1. Question text\nA. Option A\nB. Option B\nC. Option C\nD. Option D\nAnswer: A
const parseNumberedFormat = (text: string, errors: string[]): Partial<Question>[] => {
    const questions: Partial<Question>[] = [];
    const blocks = text.split(/\n\s*\n/); // Split by empty lines

    blocks.forEach((block, idx) => {
        const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 3) return; // Need at least question + 2 options + answer

        // Extract question (first line, may start with number)
        const questionMatch = lines[0].match(/^(?:\d+[\.\)]\s*)?(.+)$/);
        if (!questionMatch) {
            errors.push(`Block ${idx + 1}: Could not parse question`);
            return;
        }
        const questionText = questionMatch[1];

        // Extract options
        const options: { letter: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];
        const answerLine = lines.find(l => l.toLowerCase().startsWith('answer'));

        lines.forEach(line => {
            const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)$/);
            if (optMatch) {
                options.push({
                    letter: optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D',
                    text: optMatch[2]
                });
            }
        });

        // Extract answer
        let correctAnswer = '';
        if (answerLine) {
            const ansMatch = answerLine.match(/answer[:\s]*([A-Da-d])/i);
            if (ansMatch) {
                correctAnswer = ansMatch[1].toUpperCase();
            }
        }

        if (options.length >= 2 && correctAnswer) {
            questions.push({
                questionText,
                questionType: 'multiple_choice',
                options,
                correctAnswer
            });
        } else {
            errors.push(`Block ${idx + 1}: Missing options or answer`);
        }
    });

    return questions;
};

// Parse: Question\tA\tB\tC\tD\tAnswer (tab-separated)
const parseTabularFormat = (text: string, errors: string[]): Partial<Question>[] => {
    const questions: Partial<Question>[] = [];
    const lines = text.trim().split('\n');

    // Skip header if present
    const startIdx = lines[0]?.toLowerCase().includes('question') ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split('\t').map(c => c.trim());
        if (cols.length < 6) {
            errors.push(`Row ${i + 1}: Not enough columns (need Question, A, B, C, D, Answer)`);
            continue;
        }

        const [questionText, optA, optB, optC, optD, answer] = cols;

        if (!questionText || !answer) {
            errors.push(`Row ${i + 1}: Missing question or answer`);
            continue;
        }

        questions.push({
            questionText,
            questionType: 'multiple_choice',
            options: [
                { letter: 'A', text: optA || '' },
                { letter: 'B', text: optB || '' },
                { letter: 'C', text: optC || '' },
                { letter: 'D', text: optD || '' }
            ],
            correctAnswer: answer.toUpperCase()
        });
    }

    return questions;
};

// Parse: JSON array
const parseJSONFormat = (text: string, errors: string[]): Partial<Question>[] => {
    try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
            errors.push('JSON must be an array');
            return [];
        }
        return parsed;
    } catch (e) {
        errors.push(`Invalid JSON: ${(e as Error).message}`);
        return [];
    }
};

export const bulkImportQuestions = async (
    bankId: string,
    questions: Partial<Question>[],
    defaultMetadata: {
        subject: string;
        gradeLevel: string;
        createdBy: string;
    }
): Promise<{ success: number; failed: number; questionIds: string[] }> => {
    let success = 0;
    let failed = 0;
    const questionIds: string[] = [];

    // Reverse the order so the FIRST question in the list is added LAST.
    // This gives it the latest timestamp, ensuring it appears at the TOP of the list
    // (since the list is sorted Newest First).
    const questionsToImport = [...questions].reverse();

    for (const q of questionsToImport) {
        try {
            const id = await addQuestion(bankId, {
                questionText: q.questionText || '',
                questionType: q.questionType || 'multiple_choice',
                options: q.options || [],
                correctAnswer: q.correctAnswer || '',
                explanation: q.explanation || '',
                subject: q.subject || defaultMetadata.subject,
                gradeLevel: q.gradeLevel || defaultMetadata.gradeLevel,
                competencyCode: q.competencyCode || '',
                learningCompetency: q.learningCompetency || '',
                cognitiveLevel: q.cognitiveLevel || 'Understanding',
                difficultyLevel: q.difficultyLevel || 'Average',
                createdBy: defaultMetadata.createdBy,
                tags: q.tags || []
            });
            questionIds.push(id);
            success++;
        } catch (e) {
            failed++;
        }
    }

    return { success, failed, questionIds };
};
