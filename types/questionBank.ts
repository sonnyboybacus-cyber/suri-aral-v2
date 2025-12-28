// =========================================================================
// QUESTION BANK & TOS TYPES
// =========================================================================

// ---------------------------------------------------------------------------
// COGNITIVE LEVELS (Bloom's Taxonomy)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// COGNITIVE LEVELS (Bloom's Taxonomy) - Now dynamic string to support configuration
// ---------------------------------------------------------------------------
export type CognitiveLevel = string;

export type DifficultyLevel = 'Easy' | 'Average' | 'Difficult';

export type QuestionType = 'multiple_choice' | 'true_false' | 'identification' | 'essay';

// ---------------------------------------------------------------------------
// QUESTION BANK
// ---------------------------------------------------------------------------

export interface QuestionOption {
    letter: 'A' | 'B' | 'C' | 'D';
    text: string;
}

export interface Question {
    id: string;
    questionText: string;
    questionType: QuestionType;
    options?: QuestionOption[];
    correctAnswer: string;          // 'A', 'B', 'C', 'D', 'True', 'False', or text
    explanation?: string;

    // Metadata for organization
    subject: string;
    gradeLevel: string;
    competencyCode?: string;        // Made optional (Moved to TOS)
    learningCompetency?: string;    // Made optional (Moved to TOS)
    quarter?: string;               // Added: Quarter (1st, 2nd, 3rd, 4th)
    cognitiveLevel?: CognitiveLevel; // Made optional (Moved to TOS)
    difficultyLevel?: DifficultyLevel; // Made optional (Moved to TOS)

    // Tracking
    createdBy: string;
    createdAt: number;
    updatedAt: number;
    timesUsed: number;
    tags?: string[];
}

export interface QuestionBank {
    id: string;
    name: string;
    subject: string;
    gradeLevel: string;
    quarter?: string;               // Added: Quarter (1st, 2nd, 3rd, 4th)
    schoolYear: string;             // Added: School Year
    description?: string;
    questionCount: number;          // Denormalized for quick display
    createdBy: string;
    createdByName?: string;
    createdAt: number;
    updatedAt: number;
    isShared: boolean;              // Shared with all teachers (read-only for non-owners)
    schoolId?: string;
}

// ---------------------------------------------------------------------------
// TABLE OF SPECIFICATIONS (TOS)
// ---------------------------------------------------------------------------

export interface TOSEntry {
    id: string;
    competencyCode: string;         // e.g., "EN11/12ES-Ia-1"
    contentStandard: string;
    performanceStandard: string;
    learningCompetency: string;
    cognitiveLevel: CognitiveLevel;
    numberOfItems: number;
    itemPlacement?: number[];       // Which item numbers (e.g., [1, 2, 3])
    weight?: number;                // Percentage weight
    allocatedQuestionIds?: string[]; // IDs of questions allocated to this slot
}

export interface TOS {
    id: string;
    title: string;
    subject: string;
    gradeLevel: string;
    quarter: string;
    schoolYear: string;             // Added: School Year
    totalItems: number;
    entries: TOSEntry[];
    createdBy: string;
    createdByName?: string;
    createdAt: number;
    updatedAt: number;
    schoolId?: string;
    isShared: boolean;
    linkedQuestionBankId?: string; // Links this TOS to a specific Question Bank
}

// ---------------------------------------------------------------------------
// DEPED CURRICULUM COMPETENCY (Pre-loaded reference data)
// ---------------------------------------------------------------------------

export interface DepEdCompetency {
    id?: string;                    // Optional ID for database storage
    code: string;                   // e.g., "EN11/12ES-Ia-1"
    subject: string;
    gradeLevel: string;
    quarter: string;
    contentStandard: string;
    performanceStandard: string;
    learningCompetency: string;
    contentTopic?: string;          // Added: Topic/Subject Matter
    suggestedCognitiveLevel?: CognitiveLevel;
}

// ---------------------------------------------------------------------------
// IMPORT FORMATS
// ---------------------------------------------------------------------------

export type ImportFormat =
    | 'numbered'        // 1. Question text\nA. Option\nB. Option...
    | 'tabular'         // Question\tA\tB\tC\tD\tAnswer
    | 'json'            // JSON array of questions
    | 'pdf';            // PDF Upload import

export interface ImportResult {
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
    questions: Partial<Question>[];
}
