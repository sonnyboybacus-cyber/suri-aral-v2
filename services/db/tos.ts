// =========================================================================
// TOS (TABLE OF SPECIFICATIONS) DATABASE SERVICE
// =========================================================================

import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { TOS, TOSEntry, DepEdCompetency } from '../../types/questionBank';
import { parseSnapshot, generateUUID } from './core';

// ---------------------------------------------------------------------------
// REFS
// ---------------------------------------------------------------------------

const getTOSRef = () => db.ref('tos_templates');
const getCompetenciesRef = () => db.ref('deped_competencies');

// ---------------------------------------------------------------------------
// TOS CRUD
// ---------------------------------------------------------------------------

export const createTOS = async (tos: Omit<TOS, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = generateUUID();
    const now = Date.now();
    const newTOS: TOS = {
        ...tos,
        id,
        entries: [],
        createdAt: now,
        updatedAt: now
    };
    await getTOSRef().child(id).set(newTOS);
    return id;
};

export const loadTOSList = async (userId: string): Promise<TOS[]> => {
    const snapshot = await getTOSRef().once('value');
    const tosList = parseSnapshot<TOS>(snapshot);

    // Return ALL templates (Global View)
    return tosList;
};

export const loadTOS = async (tosId: string): Promise<TOS | null> => {
    const snapshot = await getTOSRef().child(tosId).once('value');
    return snapshot.exists() ? snapshot.val() as TOS : null;
};

export const updateTOS = async (tosId: string, updates: Partial<TOS>): Promise<void> => {
    await getTOSRef().child(tosId).update({
        ...updates,
        updatedAt: Date.now()
    });
};

export const deleteTOS = async (tosId: string): Promise<void> => {
    await getTOSRef().child(tosId).remove();
};

// ---------------------------------------------------------------------------
// TOS ENTRY HELPERS
// ---------------------------------------------------------------------------

export const addTOSEntry = async (tosId: string, entry: Omit<TOSEntry, 'id'>): Promise<string> => {
    const tos = await loadTOS(tosId);
    if (!tos) throw new Error('TOS not found');

    const id = generateUUID();
    const newEntry: TOSEntry = { ...entry, id };

    const updatedEntries = [...(tos.entries || []), newEntry];
    const totalItems = updatedEntries.reduce((sum, e) => sum + e.numberOfItems, 0);

    await updateTOS(tosId, { entries: updatedEntries, totalItems });
    return id;
};

export const updateTOSEntry = async (tosId: string, entryId: string, updates: Partial<TOSEntry>): Promise<void> => {
    const tos = await loadTOS(tosId);
    if (!tos) throw new Error('TOS not found');

    const updatedEntries = (tos.entries || []).map(e =>
        e.id === entryId ? { ...e, ...updates } : e
    );
    const totalItems = updatedEntries.reduce((sum, e) => sum + e.numberOfItems, 0);

    await updateTOS(tosId, { entries: updatedEntries, totalItems });
};

export const deleteTOSEntry = async (tosId: string, entryId: string): Promise<void> => {
    const tos = await loadTOS(tosId);
    if (!tos) throw new Error('TOS not found');

    const updatedEntries = (tos.entries || []).filter(e => e.id !== entryId);
    const totalItems = updatedEntries.reduce((sum, e) => sum + e.numberOfItems, 0);

    await updateTOS(tosId, { entries: updatedEntries, totalItems });
};

// ---------------------------------------------------------------------------
// DEPED COMPETENCIES (Pre-loaded reference data)
// ---------------------------------------------------------------------------

export const loadCompetencies = async (filters?: {
    subject?: string;
    gradeLevel?: string;
    quarter?: string;
}): Promise<DepEdCompetency[]> => {
    // 1. Load from Global DepEd Competencies
    const snapshot = await getCompetenciesRef().once('value');
    let competencies = parseSnapshot<DepEdCompetency>(snapshot);

    if (filters?.subject) {
        competencies = competencies.filter(c => c.subject === filters.subject);
    }
    if (filters?.gradeLevel) {
        competencies = competencies.filter(c => c.gradeLevel === filters.gradeLevel);
    }
    if (filters?.quarter) {
        competencies = competencies.filter(c => c.quarter === filters.quarter);
    }

    // 2. Load from Subject Curriculum (Legacy/Integrated Source)
    if (filters?.subject) {
        try {
            // We need to find the subject by Name (since we only have the name in filters)
            // Ideally we would have the ID, but TOS currently stores subject Name.
            // We fetch all subjects to find the match. Use loadSubjects() logic here to avoid circular dep if possible, or just raw db call.
            const subjectsSnap = await db.ref('subjects').once('value');
            const subjectsVal = subjectsSnap.val();

            if (subjectsVal) {
                const subjectsList = Object.values(subjectsVal) as any[]; // Type as any to access curriculum safely
                // Find subject matching name
                // Note: Subject names might differ slightly (case), so we try flexible match
                const matchedSubject = subjectsList.find(s =>
                    s.name?.trim().toLowerCase() === filters.subject?.trim().toLowerCase()
                );

                if (matchedSubject && matchedSubject.curriculum) {
                    const curriculum = matchedSubject.curriculum as any[];
                    // Filter by Quarter if provided (Case insensitive and trim)
                    const targetUnits = filters.quarter
                        ? curriculum.filter(u => u.quarter?.trim().toLowerCase() === filters.quarter?.trim().toLowerCase())
                        : curriculum;

                    targetUnits.forEach(unit => {
                        if (unit.weeks) {
                            unit.weeks.forEach((week: any) => {
                                if (week.competencies) {
                                    week.competencies.forEach((comp: any) => {
                                        // Avoid duplicates
                                        const code = comp.code;
                                        if (!competencies.some(existing => existing.code === code)) {
                                            competencies.push({
                                                code: comp.code,
                                                learningCompetency: comp.description,
                                                subject: matchedSubject.name,
                                                gradeLevel: matchedSubject.gradeLevel, // Use subject's grade level if available
                                                quarter: unit.quarter,
                                                contentStandard: week.contentStandard || '',
                                                performanceStandard: week.performanceStandard || '',
                                                contentTopic: week.topic || unit.unitTitle || '', // Extract Topic
                                                suggestedCognitiveLevel: 'Understanding' // Default
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("Failed to load competencies from Subject curriculum:", e);
        }
    }

    return competencies;
};

export const addCompetency = async (competency: DepEdCompetency): Promise<void> => {
    // Use code as ID for easy lookup
    await getCompetenciesRef().child(competency.code.replace(/[\/\.]/g, '_')).set(competency);
};

export const bulkLoadCompetencies = async (competencies: DepEdCompetency[]): Promise<void> => {
    const updates: Record<string, DepEdCompetency> = {};
    competencies.forEach(c => {
        updates[c.code.replace(/[\/\.]/g, '_')] = c;
    });
    await getCompetenciesRef().update(updates);
};

// ---------------------------------------------------------------------------
// TOS CALCULATIONS
// ---------------------------------------------------------------------------

export const calculateTOSStats = (entries: TOSEntry[]): {
    totalItems: number;
    byLevel: Record<string, number>;
    byCompetency: Record<string, number>;
} => {
    if (!entries) return { totalItems: 0, byLevel: {}, byCompetency: {} };

    const totalItems = entries.reduce((sum, e) => sum + e.numberOfItems, 0);

    const byLevel: Record<string, number> = {};
    const byCompetency: Record<string, number> = {};

    entries.forEach(e => {
        byLevel[e.cognitiveLevel] = (byLevel[e.cognitiveLevel] || 0) + e.numberOfItems;
        byCompetency[e.competencyCode] = (byCompetency[e.competencyCode] || 0) + e.numberOfItems;
    });

    return { totalItems, byLevel, byCompetency };
};

// ---------------------------------------------------------------------------
// EXAM GENERATION FROM TOS
// ---------------------------------------------------------------------------

export const assignItemPlacements = (entries: TOSEntry[]): TOSEntry[] => {
    let currentItem = 1;
    return entries.map(entry => {
        const placement: number[] = [];
        for (let i = 0; i < entry.numberOfItems; i++) {
            placement.push(currentItem++);
        }
        return { ...entry, itemPlacement: placement };
    });
};
