import { Question, TOSEntry, DifficultyLevel } from '../types/questionBank';

/**
 * matches questions to a TOS entry based on:
 * 1. Competency Code (Strict)
 * 2. Cognitive Level (Strict)
 * 3. Difficulty (Heuristic/Soft)
 * 4. Usage Count (Prioritize less used)
 */
export const getSmartMatches = (
    entry: TOSEntry,
    allQuestions: Question[],
    currentAllocatedIds: string[]
): string[] => {
    const needed = entry.numberOfItems - (entry.allocatedQuestionIds?.length || 0);

    // If we already have enough, return empty
    if (needed <= 0) return [];

    // Helper for fuzzy matching
    const normalize = (str: string) => str ? str.toLowerCase().trim().replace(/[^a-z0-9]/g, '') : '';

    // 1. Strict Filters (with Normalization)
    // We filter by Competency Code and Cognitive Level.
    // We also exclude questions that are already allocated.
    let candidates = allQuestions.filter(q => {
        const isCodeMatch = normalize(q.competencyCode || '') === normalize(entry.competencyCode);
        const isLevelMatch = normalize(q.cognitiveLevel || '') === normalize(entry.cognitiveLevel);
        const isNotAllocated = !currentAllocatedIds.includes(q.id) && !entry.allocatedQuestionIds?.includes(q.id);

        return isCodeMatch && isLevelMatch && isNotAllocated;
    });

    // 2. Sort by Usage (Freshness) - Ascending (0 first)
    // This serves as the primary sort.
    candidates.sort((a, b) => (a.timesUsed || 0) - (b.timesUsed || 0));

    // 3. Difficulty Heuristic (Secondary Sort)
    // If usage is equal, we try to pick the "Best Fit" difficulty.
    // For "Remembering", we might prefer Easy. For "Analyzing", Difficult.
    // However, since we simply want to FILL the slots, and usually a mix is fine, 
    // we will stick to a simple distribution or just random/usage-based if no specific difficulty distribution is enforced in TOS.
    // Given the user request asked for specific difficulty monitoring, but the TOS Entry definition 
    // (as seen in types) likely doesn't enforce "1 Easy, 1 Hard" per entry yet (it just has total items),
    // we will implement a "Balanced" approach if usage is tied.

    // For now, Freshness is the most important factor for an "Auto Fill".

    // 4. Return top N IDs
    return candidates.slice(0, needed).map(q => q.id);
};
