
export type HistoryMode = 'timeline' | 'comparison' | 'table' | 'text';

export interface TimelineEvent {
    year: string;
    title: string;
    description: string;
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
    timelineData?: TimelineEvent[];
    comparisonData?: {
        subjectA: string;
        subjectB: string;
        points: ComparisonPoint[];
    };
    tableData?: {
        headers: string[];
        rows: string[][];
    };
}

// Data SA Types
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
    
    // Statistical Tables (The "Heavy Lifting")
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

export interface DataAnalysisResult { // Legacy wrapper for backward compatibility if needed
    insight: string;
    stats: Record<string, string | number>;
    chartType: 'bar' | 'line' | 'area' | 'scatter';
    chartData: ChartDataPoint[];
    xAxisKey: string;
    dataKeys: string[];
    projectedData?: ChartDataPoint[];
}

export interface TestMetadata {
  district: string;
  psds: string;
  school: string;
  schoolHead: string;
  schoolYear: string;
  titleOfExamination: string;
  subject: string;
  gradeLevel: string;
  totalItems: number;
  testTakers: number;
  section: string;
  teacherInCharge: string;
  answerKey: string[];
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

export interface AIContext {
  // Item Analysis Fields
  metadata?: TestMetadata;
  students?: Student[];
  analysisResults?: ItemAnalysisResult[];
  questions?: string;
  
  // Data Analysis Fields
  dataAnalysisResult?: DataAnalysisResult;
  advancedAnalysisResult?: AdvancedAnalysisResult;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  images?: string[]; // Base64 strings for generated charts
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
  lastModified: number; // as timestamp
}

export interface SessionInfo {
  id: string;
  titleOfExamination: string;
  lastModified: number;
}

export interface StudentSF1 {
    id: string;
    lrn: string;
    lastName: string;
    firstName: string;
    middleName: string;
    extensionName: string;
    sex: 'Male' | 'Female';
    birthDate: string; // YYYY-MM-DD
    age: number;
    motherTongue: string;
    ethnicGroup: string;
    religion: string;
    addressStreet: string;
    addressBarangay: string;
    addressCity: string;
    addressProvince: string;
    fatherName: string;
    motherName: string;
    guardianName: string;
    guardianRelationship: string;
    contactNumber: string;
    remarks: string;
    deletedAt?: number;
}

export interface Teacher {
    id: string;
    employeeId: string;
    lastName: string;
    firstName: string;
    middleName: string;
    extensionName: string;
    sex: 'Male' | 'Female';
    email: string;
    phoneNumber: string;
    position: string;
    specialization: string;
    dateOfAppointment: string; // YYYY-MM-DD
    status: 'Permanent' | 'Substitute' | 'Probationary' | 'Contractual';
    deletedAt?: number;
    linkedAccountId?: string; // Links to UserProfile uid
    hasAccount?: boolean; // Fallback flag indicating registration
}

export interface LearningCompetency {
    description: string;
    code: string;
}

export interface WeeklyUnit {
    id: string;
    orderIndex: number;
    weekLabel: string; // e.g., "Week 1"
    contentTopic: string; // The main subject matter
    contentStandard: string;
    performanceStandard: string;
    competencies: LearningCompetency[];
}

export interface QuarterUnit {
    quarter: string; // e.g., "1st Quarter"
    weeks: WeeklyUnit[];
}

export interface Subject {
    id: string;
    code: string; // e.g. MATH10
    name: string; // e.g. Mathematics 10
    description: string;
    department: string;
    gradeLevel: string;
    deletedAt?: number;
    // SHS Fields
    classification?: 'Core' | 'Applied' | 'Specialized';
    track?: string; // Academic, TVL, etc.
    strand?: string; // STEM, ABM, ICT, etc.
    semester?: '1st Semester' | '2nd Semester';
    prerequisiteId?: string;
    // Curriculum Guide
    curriculum?: QuarterUnit[];
}

export interface ClassSubject {
    id: string;
    name: string;
    teacherId: string; // Corresponds to Teacher['id']
}

export interface ScheduleSlot {
    id: string;
    day: string; // 'Monday', 'Tuesday', etc.
    startTime: string; // '08:00'
    endTime: string; // '09:00'
    subjectId: string; // Links to ClassSubject.id
    subjectName: string;
    teacherId: string;
    teacherName: string;
    type?: 'class' | 'break';
}

export interface ClassInfo {
    id: string;
    schoolId: string; // Corresponds to SchoolInfo['id']
    gradeLevel: string;
    section: string;
    schoolYear: string;
    adviserId: string; // Corresponds to Teacher['id']
    subjects: ClassSubject[];
    studentIds: string[]; // List of StudentSF1['id']
    schedule?: ScheduleSlot[];
    deletedAt?: number;
}

export interface SchoolLocation {
    lat: number;
    lng: number;
    address: string;
}

export interface SchoolRoom {
    id: string;
    roomNumber: string;
    type: 'Instructional' | 'Laboratory' | 'Library' | 'Clinic' | 'Office' | 'ICT Lab' | 'Other';
    capacity: number;
    condition: 'Good' | 'Needs Repair' | 'Condemned';
}

export interface SchoolInfo {
    id: string;
    schoolId: string;
    schoolName: string;
    schoolYear: string;
    curriculum: string;
    gradeLevels: string; // e.g., "K-6", "7-10"
    district: string;
    division: string;
    region: string;
    principalId: string;
    assignedTeacherIds: string[];
    deletedAt?: number;
    location?: SchoolLocation;
    rooms?: SchoolRoom[];
}

export type UserRole = 'admin' | 'teacher';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    createdAt: number;
}

export interface ActivityLogEntry {
    id: string;
    userId: string;
    userName: string;
    action: 'create' | 'update' | 'delete' | 'restore' | 'other';
    module: 'Student' | 'Teacher' | 'Class' | 'School' | 'Item Analysis' | 'Account' | 'Planner' | 'Announcements' | 'SURI-ARAL Chat' | 'Lesson Plan' | 'Subject' | 'Schedule' | 'Learn SA' | 'History SA' | 'Data SA' | 'Reading SA';
    details: string;
    timestamp: number;
}

// NEW: User Activity Log for Suri Tracker (Learning History)
export interface UserActivity {
    id: string;
    type: 'LOGIN' | 'TUTOR' | 'EXAM' | 'STATS' | 'NOTEBOOK' | 'READING' | 'HISTORY' | 'DATA_ANALYSIS';
    title: string;
    subtitle?: string;
    timestamp: number;
    contextData?: {
        chatMode: 'tutor' | 'history' | 'stats' | 'writing' | 'exam_prep' | 'reading' | 'sa_tutor';
        messages: ChatMessage[];
    };
}

export interface Flashcard {
    front: string;
    back: string;
}

export interface GamificationProfile {
    current_xp: number;
    current_level: number;
    current_streak: number;
    last_login_date: string; // YYYY-MM-DD
    badges_earned: string[];
    last_pin_date?: string; // YYYY-MM-DD
}

export type MissionType = 'MATH_SOLVER' | 'READING_SESSION' | 'HISTORY_QUERY' | 'FILE_UPLOAD' | 'STATS_ANALYSIS' | 'STUDY_SESSION';

export interface DailyMission {
    id: string;
    type: MissionType;
    description: string;
    target: number;
    progress: number;
    completed: boolean;
    rewardXP: number;
}

export interface UserDailyMissions {
    userId: string;
    date: string; // YYYY-MM-DD
    missions: DailyMission[];
    bonusClaimed: boolean;
}

export interface PinnedNote {
    id: string;
    content: string;
    timestamp: number;
    sourceMode: string;
    images?: string[];
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

export interface Announcement {
    id: string;
    title: string;
    content: string;
    date: number;
    authorName: string;
    authorId: string;
}

export interface LessonPlan {
  id: string;
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
  subTaskedObjectives: string; // Formatted as list

  // II. Content
  concepts: string;
  
  // References
  refGuidePages: string;
  refLearnerPages: string;
  refTextbookPages: string;
  otherResources: string;

  // III. Procedure
  preparatoryActivities: string; // Prayer, Review, Motivation
  presentation: string;
  lessonProper: string; // Developmental Activities

  // IV. Application
  groupActivity: string;

  // V. Assessment
  assessment: string;

  // VI. Assignment
  assignment: string;

  preparedBy: string;
  notedBy: string;
  
  createdAt: number;
}

// --- Learn SA Types ---
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

export type View = 'dashboard' | 'studentRegistration' | 'itemAnalysis' | 'teacherInformation' | 'classInformation' | 'schoolInformation' | 'subjectManagement' | 'accountInformation' | 'announcements' | 'activityLog' | 'notifications' | 'settings' | 'lessonPlanner' | 'learnSA' | 'studyPlanner' | 'historySA' | 'dataSA' | 'readingSA' | 'quizSA';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: View;
}

export interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    language: 'english' | 'filipino';
    showWebImages: boolean;
    saveHistory: boolean;
    responseStyle: 'concise' | 'detailed';
    studyReminderTime: string;
    pushNotifications?: boolean;
}

export interface QuizQuestion {
    id: string;
    type: 'MultipleChoice' | 'Formula';
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface AssistantContext {
    schoolName: string;
    location: string;
    schoolYear: string;
    totalStudents: number;
    totalTeachers: number;
    activeClasses: number;
    totalSubjects: number;
}

export interface ScheduleItem {
    date: string;
    topic: string;
    focus: string;
}
