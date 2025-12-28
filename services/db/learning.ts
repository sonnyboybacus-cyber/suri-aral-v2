
import firebase from 'firebase/compat/app';
import { StudyPlan, LessonPlan, SessionData, SessionInfo, ProgressRecord, GamificationProfile, UserDailyMissions, DailyMission, PinnedNote, SavedQuiz, QuizResult, LearningJourney, Curriculum } from '../../types';
import { db } from '../firebase';
import { parseSnapshot, logActivity, sendNotification, logUserActivity } from './core';

// --- REFS ---
const getStudyPlansRef = (userId: string) => db.ref(`users/${userId}/study_plans`);
const getLessonPlansRef = (userId: string) => db.ref(`users/${userId}/lesson_plans`);
const getSessionsRef = (userId: string) => db.ref(`users/${userId}/sessions`);
const getSessionRef = (userId: string, sessionId: string) => db.ref(`users/${userId}/sessions/${sessionId}`);
const getStudentProgressRef = (studentId: string) => db.ref(`student_progress/${studentId}`);
const getGamificationRef = (userId: string) => db.ref(`users/${userId}/gamification`);
const getDailyMissionRef = (userId: string, dateStr: string) => db.ref(`users/${userId}/daily_missions_calendar/${dateStr}`);
const getNotebookRef = (userId: string) => db.ref(`users/${userId}/notebook`);
const getQuizLibraryRef = (userId: string) => db.ref(`users/${userId}/quiz_library`);
const getQuizResultsRef = (userId: string) => db.ref(`users/${userId}/quiz_results`);
const getLearningJourneysRef = (userId: string) => db.ref(`users/${userId}/learning_journeys`);

// --- LEARN SA: JOURNEYS ---
export const saveLearningJourney = async (userId: string, curriculum: Curriculum, style: string): Promise<string> => {
    const ref = getLearningJourneysRef(userId);
    const newRef = ref.push();
    const journey: LearningJourney = {
        id: newRef.key!,
        topic: curriculum.topic,
        style: style as any,
        totalModules: curriculum.modules.length,
        completedModules: 0,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        curriculumData: curriculum
    };
    await newRef.set(journey);
    return journey.id;
};

export const loadLearningJourneys = async (userId: string): Promise<LearningJourney[]> => {
    const ref = getLearningJourneysRef(userId);
    const snapshot = await ref.once('value');
    return parseSnapshot<LearningJourney>(snapshot);
};

export const updateLearningJourneyProgress = async (userId: string, journeyId: string, completedCount: number, updatedCurriculum: Curriculum) => {
    const ref = getLearningJourneysRef(userId).child(journeyId);
    await ref.update({
        completedModules: completedCount,
        lastAccessed: Date.now(),
        curriculumData: updatedCurriculum
    });
};

export const deleteLearningJourney = async (userId: string, journeyId: string) => {
    await getLearningJourneysRef(userId).child(journeyId).remove();
};

// --- QUIZ SA ---
export const saveQuizToLibrary = async (userId: string, topic: string, questions: any[]): Promise<string> => {
    const ref = getQuizLibraryRef(userId);
    const newRef = ref.push();
    const quiz: SavedQuiz = {
        id: newRef.key!,
        topic,
        questions,
        createdAt: Date.now(),
        difficulty: 'Mixed' // Default, could be calculated
    };
    await newRef.set(quiz);
    await logActivity(userId, "User", "create", "Quiz SA", `Saved quiz: ${topic}`);
    return newRef.key!;
};

export const loadQuizLibrary = async (userId: string): Promise<SavedQuiz[]> => {
    const ref = getQuizLibraryRef(userId);
    const snapshot = await ref.once('value');
    return parseSnapshot<SavedQuiz>(snapshot);
};

export const deleteSavedQuiz = async (userId: string, quizId: string) => {
    await getQuizLibraryRef(userId).child(quizId).remove();
};

export const saveQuizResult = async (userId: string, quizId: string, topic: string, score: number, total: number): Promise<void> => {
    const ref = getQuizResultsRef(userId);
    const newRef = ref.push();
    const result: QuizResult = {
        id: newRef.key!,
        quizId,
        topic,
        score,
        totalItems: total,
        date: Date.now()
    };
    await newRef.set(result);
    await logUserActivity(userId, {
        type: 'EXAM',
        title: `Quiz: ${topic}`,
        subtitle: `Score: ${score}%`
    });

    // Gamification hook
    if (score >= 80) {
        const { awardXP } = await import('./learning'); // Lazy import to avoid circular dep issues if any
        await awardXP(userId, 30);
    }
};

export const loadQuizHistory = async (userId: string): Promise<QuizResult[]> => {
    const ref = getQuizResultsRef(userId);
    const snapshot = await ref.once('value');
    return parseSnapshot<QuizResult>(snapshot);
};

// --- ANALYTICS ---
export const getPerformanceTrend = async (userId: string): Promise<{ date: string, score: number, title: string }[]> => {
    const sessionsRef = getSessionsRef(userId);
    const snapshot = await sessionsRef.once('value');

    if (!snapshot.exists()) return [];

    const sessionsData = snapshot.val();
    const trend = Object.values(sessionsData).map((session: any) => {
        const totalItems = session.metadata?.totalItems || 0;
        const students = session.students || [];
        const title = session.metadata?.titleOfExamination || 'Untitled';

        if (totalItems === 0 || students.length === 0) return null;

        let totalScore = 0;
        let maxScore = totalItems * students.length;

        students.forEach((s: any) => {
            const score = (s.responses || []).reduce((a: number, b: number) => a + b, 0);
            totalScore += score;
        });

        const mps = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        return {
            timestamp: session.lastModified || Date.now(),
            score: parseFloat(mps.toFixed(1)),
            title
        };
    }).filter(item => item !== null) as { timestamp: number, score: number, title: string }[];

    // Sort by date
    trend.sort((a, b) => a.timestamp - b.timestamp);

    // Return formatted for chart (limit to last 10 for readability)
    return trend.slice(-10).map(t => ({
        date: new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: t.score,
        title: t.title
    }));
};

// --- STUDY PLANNER ---
export const saveStudyPlan = async (userId: string, plan: Omit<StudyPlan, 'id' | 'createdAt'>): Promise<void> => {
    const plansRef = getStudyPlansRef(userId);
    const newPlanRef = plansRef.push();

    // Sanitize to prevent undefined values
    const sanitizedSchedule = (plan.schedule || []).map(item => ({
        date: item.date || new Date().toISOString(),
        topic: item.topic || "Review",
        focus: item.focus || "General Concepts",
        completed: !!item.completed
    }));

    const fullPlan: StudyPlan = {
        id: newPlanRef.key!,
        eventName: plan.eventName || "Untitled Plan",
        examDate: plan.examDate || new Date().toISOString(),
        topics: plan.topics || "General Review",
        difficulty: plan.difficulty || "Medium",
        schedule: sanitizedSchedule,
        createdAt: Date.now()
    };

    await newPlanRef.set(fullPlan);
};

export const loadStudyPlans = async (userId: string): Promise<StudyPlan[]> => {
    const plansRef = getStudyPlansRef(userId);
    const snapshot = await plansRef.once('value');
    return parseSnapshot<StudyPlan>(snapshot);
};

export const deleteStudyPlan = async (userId: string, planId: string): Promise<void> => {
    const planRef = db.ref(`users/${userId}/study_plans/${planId}`);
    await planRef.remove();
};

// --- LESSON PLANNER ---
export const saveLessonPlan = async (userId: string, plan: LessonPlan, planId?: string): Promise<string> => {
    const sanitizedPlan = {
        learningArea: plan.learningArea || '',
        gradeLevel: plan.gradeLevel || '',
        quarter: plan.quarter || '',
        timeAllotment: plan.timeAllotment || '',
        topic: plan.topic || 'Untitled Plan',
        competencyCode: plan.competencyCode || '',
        strategy: plan.strategy || '',
        contentStandards: plan.contentStandards || '',
        performanceStandards: plan.performanceStandards || '',
        learningCompetencies: plan.learningCompetencies || '',
        objectivesKnowledge: plan.objectivesKnowledge || '',
        objectivesPsychomotor: plan.objectivesPsychomotor || '',
        objectivesAffective: plan.objectivesAffective || '',
        subTaskedObjectives: plan.subTaskedObjectives || '',
        concepts: plan.concepts || '',
        refGuidePages: plan.refGuidePages || '',
        refLearnerPages: plan.refLearnerPages || '',
        refTextbookPages: plan.refTextbookPages || '',
        otherResources: plan.otherResources || '',
        preparatoryActivities: plan.preparatoryActivities || '',
        presentation: plan.presentation || '',
        lessonProper: plan.lessonProper || '',
        groupActivity: plan.groupActivity || '',
        assessment: plan.assessment || '',
        assignment: plan.assignment || '',

        dllWeek: (plan.dllWeek || []).map(day => ({
            day: day.day || '',
            objectives: day.objectives || '',
            content: day.content || '',
            resources: day.resources || '',
            procedures: day.procedures || '',
            remarks: day.remarks || ''
        })),

        preparedBy: plan.preparedBy || '',
        notedBy: plan.notedBy || '',
        createdAt: plan.createdAt || Date.now(),
        lastModified: Date.now(),
        type: plan.type || 'DLP'
    };

    if (planId) {
        const planRef = db.ref(`users/${userId}/lesson_plans/${planId}`);
        await planRef.set({ ...sanitizedPlan, id: planId });
        await logActivity(userId, "User", "update", "Lesson Plan", `Updated lesson plan: ${sanitizedPlan.topic}`);
        return planId;
    } else {
        const plansRef = getLessonPlansRef(userId);
        const newRef = plansRef.push();
        const newId = newRef.key!;
        await newRef.set({ ...sanitizedPlan, id: newId });
        await logActivity(userId, "User", "create", "Lesson Plan", `Created lesson plan: ${sanitizedPlan.topic}`);
        return newId;
    }
};

export const deleteLessonPlan = async (userId: string, planId: string): Promise<void> => {
    const planRef = db.ref(`users/${userId}/lesson_plans/${planId}`);
    await planRef.remove();
    await logActivity(userId, "User", "delete", "Lesson Plan", `Deleted lesson plan ID: ${planId}`);
};

export const loadLessonPlans = async (userId: string): Promise<LessonPlan[]> => {
    const plansRef = getLessonPlansRef(userId);
    const snapshot = await plansRef.once('value');
    return parseSnapshot<LessonPlan>(snapshot);
};

// --- ITEM ANALYSIS SESSIONS ---
export const saveSession = async (userId: string, sessionId: string, data: Omit<SessionData, 'lastModified' | 'lastModified'>): Promise<void> => {
    const sessionRef = getSessionRef(userId, sessionId);
    const dataWithTimestamp = {
        ...data,
        lastModified: firebase.database.ServerValue.TIMESTAMP
    };
    await sessionRef.set(dataWithTimestamp);
};

export const createNewSession = async (userId: string, data: Omit<SessionData, 'lastModified'>): Promise<string> => {
    const sessionsRef = getSessionsRef(userId);
    const newSessionRef = sessionsRef.push();
    const dataWithTimestamp: SessionData = {
        ...data,
        lastModified: firebase.database.ServerValue.TIMESTAMP as any
    };
    await newSessionRef.set(dataWithTimestamp);
    return newSessionRef.key!;
};

export const listSessions = async (userId: string): Promise<SessionInfo[]> => {
    const sessionsRef = getSessionsRef(userId);
    const snapshot = await sessionsRef.once('value');
    if (!snapshot.exists()) return [];
    const sessionsData = snapshot.val();
    return Object.entries(sessionsData).map(([id, session]: [string, any]) => ({
        id,
        titleOfExamination: session.metadata?.titleOfExamination || 'Untitled',
        lastModified: session.lastModified,
        subject: session.metadata?.subject,
        gradeLevel: session.metadata?.gradeLevel,
        section: session.metadata?.section,
        schoolYear: session.metadata?.schoolYear,
    })).sort((a, b) => b.lastModified - a.lastModified);
};

export const loadSession = async (userId: string, sessionId: string): Promise<SessionData | null> => {
    const sessionRef = getSessionRef(userId, sessionId);
    const snapshot = await sessionRef.once('value');
    return snapshot.exists() ? snapshot.val() as SessionData : null;
};

export const deleteSession = async (userId: string, sessionId: string): Promise<void> => {
    const sessionRef = getSessionRef(userId, sessionId);
    await sessionRef.remove();
};

// --- STUDENT PROGRESS ---
export const saveStudentProgress = async (userId: string, studentId: string, history: ProgressRecord[]) => {
    await getStudentProgressRef(studentId).set(history);
};

export const addStudentProgress = async (studentId: string, record: Omit<ProgressRecord, 'id'>) => {
    const ref = getStudentProgressRef(studentId);
    const newRef = ref.push();
    await newRef.set({ ...record, id: newRef.key });
};

export const deleteStudentProgress = async (studentId: string, recordId: string) => {
    const ref = getStudentProgressRef(studentId).child(recordId);
    await ref.remove();
};

export const loadStudentProgress = async (userId: string, studentId: string): Promise<ProgressRecord[]> => {
    const snapshot = await getStudentProgressRef(studentId).once('value');
    return parseSnapshot<ProgressRecord>(snapshot);
};

// --- GAMIFICATION & MISSIONS ---
export const loadGamificationProfile = async (userId: string): Promise<GamificationProfile> => {
    const profileRef = getGamificationRef(userId);
    const snapshot = await profileRef.once('value');
    if (snapshot.exists()) {
        return snapshot.val() as GamificationProfile;
    } else {
        const defaults: GamificationProfile = {
            current_xp: 0,
            current_level: 1,
            current_streak: 1,
            last_login_date: new Date().toISOString().split('T')[0],
            badges_earned: []
        };
        await profileRef.set(defaults);
        return defaults;
    }
};

export const updateGamificationProfile = async (userId: string, updates: Partial<GamificationProfile>) => {
    const profileRef = getGamificationRef(userId);
    await profileRef.update(updates);
};

export const checkAndIncrementStreak = async (userId: string): Promise<{ streak: number, message?: string }> => {
    const profile = await loadGamificationProfile(userId);
    const today = new Date().toISOString().split('T')[0];

    if (profile.last_login_date === today) {
        return { streak: profile.current_streak };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    let message = "";

    if (profile.last_login_date === yesterdayStr) {
        newStreak = profile.current_streak + 1;
        message = `🔥 ${newStreak} Day Streak! Keep it up!`;
    } else {
        message = "Streak reset. Let's build a new one!";
    }

    await updateGamificationProfile(userId, {
        current_streak: newStreak,
        last_login_date: today
    });

    await logUserActivity(userId, {
        type: 'LOGIN',
        title: 'Logged In',
        subtitle: `Streak: ${newStreak} Days`,
    });

    return { streak: newStreak, message };
};

export const awardXP = async (userId: string, amount: number): Promise<{ newXP: number, newLevel: number, leveledUp: boolean }> => {
    const profile = await loadGamificationProfile(userId);
    const newXP = profile.current_xp + amount;
    const newLevel = Math.floor(newXP / 500) + 1;
    const leveledUp = newLevel > profile.current_level;

    await updateGamificationProfile(userId, {
        current_xp: newXP,
        current_level: newLevel
    });

    if (leveledUp) {
        sendNotification(userId, {
            title: 'Level Up!',
            message: `Congratulations! You've reached Level ${newLevel}.`,
            type: 'success'
        });
    }

    return { newXP, newLevel, leveledUp };
};

export const subscribeToGamification = (userId: string, callback: (profile: GamificationProfile) => void) => {
    const profileRef = getGamificationRef(userId);
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        }
    };
    profileRef.on('value', handler);
    return () => profileRef.off('value', handler);
};

export const getDailyMissions = async (userId: string): Promise<UserDailyMissions> => {
    const today = new Date().toISOString().split('T')[0];
    const missionsRef = getDailyMissionRef(userId, today);
    const snapshot = await missionsRef.once('value');

    if (snapshot.exists()) {
        return snapshot.val() as UserDailyMissions;
    }

    const missions: DailyMission[] = [
        { id: '1', type: 'MATH_SOLVER', description: 'Solve a Quiz', target: 1, progress: 0, completed: false, rewardXP: 20 },
        { id: '2', type: 'FILE_UPLOAD', description: 'Upload a File', target: 1, progress: 0, completed: false, rewardXP: 20 },
        { id: '3', type: 'READING_SESSION', description: 'Practice Reading', target: 1, progress: 0, completed: false, rewardXP: 20 }
    ];

    const newDaily: UserDailyMissions = {
        userId,
        date: today,
        missions: missions,
        bonusClaimed: false
    };
    await missionsRef.set(newDaily);
    return newDaily;
};

export const claimDailyBonus = async (userId: string): Promise<boolean> => {
    const today = new Date().toISOString().split('T')[0];
    const dailyRef = getDailyMissionRef(userId, today);
    const snapshot = await dailyRef.once('value');

    if (!snapshot.exists()) return false;

    const data = snapshot.val() as UserDailyMissions;
    const allCompleted = data.missions.every(m => m.completed);

    if (allCompleted && !data.bonusClaimed) {
        await dailyRef.update({ bonusClaimed: true });
        await awardXP(userId, 100);
        return true;
    }
    return false;
};

export const subscribeToMissions = (userId: string, callback: (missions: UserDailyMissions | null) => void) => {
    const today = new Date().toISOString().split('T')[0];
    const missionsRef = getDailyMissionRef(userId, today);
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            callback(null);
        }
    };
    missionsRef.on('value', handler);
    return () => missionsRef.off('value', handler);
};

// --- NOTEBOOK ---
export const savePinnedNote = async (userId: string, content: string, sourceMode: string, images?: string[]): Promise<string> => {
    const notebookRef = getNotebookRef(userId);
    const newNoteRef = notebookRef.push();
    const note: PinnedNote = {
        id: newNoteRef.key!,
        content,
        timestamp: Date.now(),
        sourceMode,
        images: images || []
    };
    await newNoteRef.set(note);
    return note.id;
};

export const subscribeToNotebook = (userId: string, callback: (notes: PinnedNote[]) => void) => {
    const notebookRef = getNotebookRef(userId);
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        const list = parseSnapshot<PinnedNote>(snapshot);
        callback(list);
    };
    notebookRef.on('value', handler);
    return () => notebookRef.off('value', handler);
};
