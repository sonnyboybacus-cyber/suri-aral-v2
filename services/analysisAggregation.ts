
import { SessionData, ItemAnalysisResult } from '../types';

export interface SchoolData {
    name: string;
    totalStudents: number;
    totalSections: number;
    mps: number;
    sections: {
        name: string;
        mps: number;
        studentCount: number;
    }[];
}

export interface ConsolidatedData {
    gradeLevel: string;
    subject: string;
    examTitle: string;
    totalStudents: number;
    totalSections: number;
    overallMPS: number;
    schools: SchoolData[]; // New Hierarchical Grouping
    competencies: {
        itemNumber: number;
        description: string;
        totalCorrect: number;
        totalResponses: number;
        mps: number;
        interpretation: 'Mastered' | 'Least Mastered' | 'Not Mastered';
    }[];
}

export const aggregateSessions = (sessions: SessionData[]): ConsolidatedData => {
    if (!sessions || sessions.length === 0) {
        throw new Error("No sessions data to aggregate");
    }

    const firstMeta = sessions[0].metadata;
    const totalItems = firstMeta.totalItems;

    // 1. Group by School
    const schoolMap = new Map<string, { sessions: SessionData[], name: string }>();

    sessions.forEach(session => {
        // Use School Name as key (or fallback to Unknown)
        const schoolName = session.metadata.school || "Unknown School";
        if (!schoolMap.has(schoolName)) {
            schoolMap.set(schoolName, { sessions: [], name: schoolName });
        }
        schoolMap.get(schoolName)!.sessions.push(session);
    });

    // 2. Process Each School
    const schools: SchoolData[] = [];
    let grandTotalStudents = 0;
    let grandTotalSections = 0;

    schoolMap.forEach((schoolData, schoolName) => {
        let schoolTotalStudents = 0;
        let schoolTotalCorrect = 0;
        let schoolTotalPossible = 0;

        const schoolSectionStats = schoolData.sessions.map(session => {
            const studentCount = session.students.length;
            schoolTotalStudents += studentCount;

            let sectionCorrect = 0;
            let sectionPossible = studentCount * totalItems;

            session.students.forEach(s => {
                sectionCorrect += s.responses.reduce<number>((sum, r) => sum + r, 0);
            });

            schoolTotalCorrect += sectionCorrect;
            schoolTotalPossible += sectionPossible;

            const mps = sectionPossible > 0 ? (sectionCorrect / sectionPossible) * 100 : 0;
            return {
                name: session.metadata.section,
                mps,
                studentCount
            };
        });

        const schoolMPS = schoolTotalPossible > 0 ? (schoolTotalCorrect / schoolTotalPossible) * 100 : 0;

        schools.push({
            name: schoolName,
            totalStudents: schoolTotalStudents,
            totalSections: schoolData.sessions.length,
            mps: schoolMPS,
            sections: schoolSectionStats
        });

        grandTotalStudents += schoolTotalStudents;
        grandTotalSections += schoolData.sessions.length;
    });

    // Sort schools by MPS
    schools.sort((a, b) => b.mps - a.mps);


    // 3. Item/Competency Consolidation (Global)
    const aggregatedItems: { totalCorrect: number, totalResponses: number, competency: string }[] = [];

    // Initialize array
    for (let i = 0; i < totalItems; i++) {
        aggregatedItems.push({
            totalCorrect: 0,
            totalResponses: 0,
            competency: firstMeta.competencies?.[i] || `Item ${i + 1}`
        });
    }

    // Sum up per item
    sessions.forEach(session => {
        // Iterate through each student in this session
        session.students.forEach(student => {
            student.responses.forEach((response, idx) => {
                if (idx < totalItems) {
                    if (response === 1) aggregatedItems[idx].totalCorrect++;
                    aggregatedItems[idx].totalResponses++;
                }
            });
        });
    });

    // Calculate Item-Level stats
    const competencies = aggregatedItems.map((item, idx) => {
        const mps = item.totalResponses > 0 ? (item.totalCorrect / item.totalResponses) * 100 : 0;
        let interpretation: 'Mastered' | 'Least Mastered' | 'Not Mastered' = 'Not Mastered';
        if (mps >= 75) interpretation = 'Mastered';
        else if (mps >= 50) interpretation = 'Least Mastered';

        return {
            itemNumber: idx + 1,
            description: item.competency,
            totalCorrect: item.totalCorrect,
            totalResponses: item.totalResponses,
            mps,
            interpretation
        };
    });

    // 4. Overall MPS (Global Weighted)
    let globalTotalCorrect = 0;
    let globalTotalPossible = 0;
    competencies.forEach(c => {
        globalTotalCorrect += c.totalCorrect;
        globalTotalPossible += c.totalResponses;
    });

    const overallMPS = globalTotalPossible > 0 ? (globalTotalCorrect / globalTotalPossible) * 100 : 0;

    return {
        gradeLevel: firstMeta.gradeLevel,
        subject: firstMeta.subject,
        examTitle: firstMeta.titleOfExamination,
        totalStudents: grandTotalStudents,
        totalSections: grandTotalSections,
        overallMPS,
        schools,
        competencies
    };
};
