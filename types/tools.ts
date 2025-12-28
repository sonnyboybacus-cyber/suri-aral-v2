
// History SA
export type HistoryMode = 'timeline' | 'comparison' | 'table' | 'text' | 'graph';

export interface TimelineEvent {
    year: string;
    title: string;
    description: string;
    type?: 'local' | 'global'; // Distinguishes user query vs global context
}

export interface GraphNode {
    id: string;
    label: string;
    type: 'root' | 'cause' | 'effect' | 'key_figure';
}

export interface GraphEdge {
    source: string;
    target: string;
    label?: string;
}

export interface ComparisonPoint {
    criteria: string;
    subjectA: string;
    subjectB: string;
}

export interface HistoryResponse {
    type: HistoryMode;
    title: string;
    summary: string;

    // Timeline Mode
    timelineData?: TimelineEvent[];
    globalContextData?: TimelineEvent[]; // Parallel timeline data

    // Comparison Mode
    comparisonData?: {
        subjectA: string;
        subjectB: string;
        points: ComparisonPoint[];
    };

    // Data Table Mode
    tableData?: {
        headers: string[];
        rows: string[][];
    };

    // Cause & Effect Graph Mode
    graphData?: {
        nodes: GraphNode[];
        edges: GraphEdge[];
    };

    // Persona Mode
    keyFigure?: {
        name: string;
        role: string;
        era: string;
        greeting: string;
    };
}

// Data SA
export type AnalysisTier = 'descriptive' | 'inferential' | 'regression' | 'predictive' | 'multivariate';

export interface ChartDataPoint {
    name: string | number;
    [key: string]: string | number;
}

export interface StatTableRow {
    label: string;
    value: string | number;
    significance?: boolean; // Highlight if p < 0.05
}

export interface AdvancedAnalysisResult {
    tier: AnalysisTier;
    insight: string;
    chartType: 'bar' | 'line' | 'area' | 'scatter' | 'composed';
    chartData: ChartDataPoint[];
    xAxisKey: string;
    dataKeys: string[];
    legendMapping?: Record<string, string>; // Maps generic keys (value1) to real names (Revenue)

    // Statistical Tables
    summaryTable?: {
        title: string;
        rows: StatTableRow[];
    };

    // For Regression/Predictive
    equation?: string;
    rSquared?: number;

    // For Inferential
    testName?: string;
    pValue?: number;

    // For Clustering
    clusters?: number;
}

// Item Analysis
export interface TestMetadata {
    district: string;
    psds: string;
    school: string;
    schoolId?: string;  // Internal ID for lookups
    schoolHead: string;
    schoolYear: string;
    titleOfExamination: string;
    dateOfExamination?: string; // YYYY-MM-DD
    quarter?: string;
    answerKey?: string[]; // Array of correct answers (A, B, C, D)
    subject: string;
    gradeLevel: string;
    totalItems: number;
    testTakers: number;
    section: string;
    teacherInCharge: string;
    competencies?: string[];
}

export interface ProgressRecord {
    id: string;
    date: string;
    testName: string;
    score: number;
    totalItems: number;
}

export interface Student {
    id: string;
    name: string;
    responses: (0 | 1)[];
    studentAnswers: string[];
    feedback: string;
    progressHistory: ProgressRecord[];
}

export interface ItemAnalysisResult {
    itemNumber: number;
    totalCorrect: number;
    mps: number;
    interpretation: 'Mastered' | 'Least Mastered' | 'Not Mastered';
    difficulty: 'Easy' | 'Moderate' | 'Difficult';
    competency?: string;
}

export interface QuestionAnalysis {
    coreConcept: string;
    commonMisconceptions: string[];
    teachingSuggestions: string[];
}

export interface InitialQuestionAnalysisResponse {
    analysis: QuestionAnalysis;
    suggestedQuestions: string[];
}

export interface RemedialQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    targetedConcept: string;
}

export interface RemediationResponse {
    questions: RemedialQuestion[];
}

export interface InitialAnalysisResponse {
    analysisReport: string;
    suggestedQuestions: string[];
}

export interface GeneralChatResponse {
    response: string;
    suggestedQuestions: string[];
}

export interface SessionData {
    metadata: TestMetadata;
    students: Student[];
    testQuestions: string;
    analysisResults?: ItemAnalysisResult[]; // Persist calculations
    lastModified: number; // as timestamp
    // Enhanced Features
    selectedTOSId?: string;
    selectedBankId?: string;
    aiAnalysisReport?: string;
    remedialQuestions?: RemedialQuestion[];
    questionAnalysis?: InitialQuestionAnalysisResponse;
}

export interface SessionInfo {
    id: string;
    titleOfExamination: string;
    lastModified: number;
    subject?: string;
    gradeLevel?: string;
    section?: string;
    schoolYear?: string;
}

// Lesson Planner
export interface DLLDay {
    day: string;
    objectives: string;
    content: string;
    resources: string;
    procedures: string;
    remarks: string;
}

export interface LessonPlan {
    id: string;
    type?: 'DLP' | 'DLL';
    learningArea: string;
    gradeLevel: string;
    quarter: string;
    timeAllotment: string;
    topic: string;
    competencyCode: string;
    strategy: string;

    // I. Objectives
    contentStandards: string;
    performanceStandards: string;
    learningCompetencies: string;

    // Detailed Objectives (K-A-P)
    objectivesKnowledge: string;
    objectivesPsychomotor: string;
    objectivesAffective: string;

    subTaskedObjectives?: string;

    // II. Content
    concepts: string;

    // References
    refGuidePages: string;
    refLearnerPages: string;
    refTextbookPages: string;
    otherResources: string;

    // III. Procedure
    preparatoryActivities: string;
    presentation: string;
    lessonProper: string;

    // IV. Application
    groupActivity: string;

    // V. Assessment
    assessment: string;

    // VI. Assignment
    assignment: string;

    // DLL Fields
    dllWeek?: DLLDay[];

    preparedBy: string;
    notedBy: string;

    createdAt: number;
}

// Learn SA
export interface LearningModule {
    id: string;
    order: number;
    title: string;
    description: string;
    status: 'locked' | 'active' | 'completed';
}

export interface Curriculum {
    id: string;
    topic: string;
    modules: LearningModule[];
}

export interface Flashcard {
    front: string;
    back: string;
}

export interface StudyPlan {
    id: string;
    eventName: string;
    examDate: string; // YYYY-MM-DD
    topics: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    schedule: {
        date: string;
        topic: string;
        focus: string;
        completed: boolean;
    }[];
    createdAt: number;
}

export interface ScheduleItem {
    date: string;
    topic: string;
    focus: string;
}

export interface QuizQuestion {
    id: string;
    type: 'MultipleChoice' | 'Formula';
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    formulaContext?: string; // Container for raw LaTeX string
}

// Quiz SA Database Types
export interface SavedQuiz {
    id: string;
    topic: string;
    questions: QuizQuestion[];
    createdAt: number;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
}

export interface QuizResult {
    id: string;
    quizId: string;
    topic: string;
    score: number;
    totalItems: number;
    date: number;
}

// Rubric Generator
export interface RubricLevel {
    score: number;
    description: string;
}

export interface RubricCriteria {
    name: string;
    levels: RubricLevel[];
}

export interface Rubric {
    title: string;
    criteria: RubricCriteria[];
}
