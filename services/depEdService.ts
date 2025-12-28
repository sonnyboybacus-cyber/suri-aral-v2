
import { StudentGradeRow } from "../types/grading";

// Helper to get defaults, but UI will allow overriding
export const getDefaultWeights = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    
    // Math, Science
    if (['mathematics', 'math', 'science'].some(s => name.includes(s))) {
        return { ww: 40, pt: 40, qa: 20 };
    }
    
    // MAPEH, EPP, TLE
    if (['mapeh', 'music', 'arts', 'physical education', 'pe', 'health', 'epp', 'tle'].some(s => name.includes(s))) {
        return { ww: 20, pt: 60, qa: 20 };
    }

    // Default: Languages, AP, EsP
    return { ww: 30, pt: 50, qa: 20 };
};

// Standard K-12 Transmutation Table (DepEd Order No. 8, s. 2015)
export const transmuteGrade = (initialGrade: number): number => {
    // Exact mapping for speed and accuracy
    if (initialGrade >= 100) return 100;
    if (initialGrade >= 98.40) return 99;
    if (initialGrade >= 96.80) return 98;
    if (initialGrade >= 95.20) return 97;
    if (initialGrade >= 93.60) return 96;
    if (initialGrade >= 92.00) return 95;
    if (initialGrade >= 90.40) return 94;
    if (initialGrade >= 88.80) return 93;
    if (initialGrade >= 87.20) return 92;
    if (initialGrade >= 85.60) return 91;
    if (initialGrade >= 84.00) return 90;
    if (initialGrade >= 82.40) return 89;
    if (initialGrade >= 80.80) return 88;
    if (initialGrade >= 79.20) return 87;
    if (initialGrade >= 77.60) return 86;
    if (initialGrade >= 76.00) return 85;
    if (initialGrade >= 74.40) return 84;
    if (initialGrade >= 72.80) return 83;
    if (initialGrade >= 71.20) return 82;
    if (initialGrade >= 69.60) return 81;
    if (initialGrade >= 68.00) return 80;
    if (initialGrade >= 66.40) return 79;
    if (initialGrade >= 64.80) return 78;
    if (initialGrade >= 63.20) return 77;
    if (initialGrade >= 61.60) return 76;
    if (initialGrade >= 60.00) return 75;
    if (initialGrade >= 56.00) return 74;
    if (initialGrade >= 52.00) return 73;
    if (initialGrade >= 48.00) return 72;
    if (initialGrade >= 44.00) return 71;
    if (initialGrade >= 40.00) return 70;
    if (initialGrade >= 36.00) return 69;
    if (initialGrade >= 32.00) return 68;
    if (initialGrade >= 28.00) return 67;
    if (initialGrade >= 24.00) return 66;
    if (initialGrade >= 20.00) return 65;
    if (initialGrade >= 16.00) return 64;
    if (initialGrade >= 12.00) return 63;
    if (initialGrade >= 8.00) return 62;
    if (initialGrade >= 4.00) return 61;
    return 60;
};

export const calculateStudentGrades = (
    student: StudentGradeRow,
    hps: { ww: number[], pt: number[], qa: number },
    weights: { ww: number, pt: number, qa: number }
): StudentGradeRow => {
    const updated = { ...student };

    // 1. Written Works
    updated.wwTotal = updated.ww.reduce((a, b) => a + b, 0);
    const totalHpsWW = hps.ww.reduce((a, b) => a + b, 0);
    updated.wwPS = totalHpsWW > 0 ? (updated.wwTotal / totalHpsWW) * 100 : 0;
    updated.wwWS = updated.wwPS * (weights.ww / 100);

    // 2. Performance Tasks
    updated.ptTotal = updated.pt.reduce((a, b) => a + b, 0);
    const totalHpsPT = hps.pt.reduce((a, b) => a + b, 0);
    updated.ptPS = totalHpsPT > 0 ? (updated.ptTotal / totalHpsPT) * 100 : 0;
    updated.ptWS = updated.ptPS * (weights.pt / 100);

    // 3. Quarterly Assessment
    updated.qaPS = hps.qa > 0 ? (updated.qa / hps.qa) * 100 : 0;
    updated.qaWS = updated.qaPS * (weights.qa / 100);

    // 4. Final
    updated.initialGrade = updated.wwWS + updated.ptWS + updated.qaWS;
    updated.quarterlyGrade = transmuteGrade(updated.initialGrade);

    return updated;
};
