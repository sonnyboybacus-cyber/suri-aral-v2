
export interface StudentGradeRow {
    studentId: string;
    studentName: string;
    gender: 'Male' | 'Female';
    
    // Raw Scores
    ww: number[];
    pt: number[];
    qa: number;

    // Calculated Values (Computed on the fly or cached)
    wwTotal: number;
    wwPS: number;
    wwWS: number;

    ptTotal: number;
    ptPS: number;
    ptWS: number;

    qaPS: number;
    qaWS: number;

    initialGrade: number;
    quarterlyGrade: number;
}

export interface ClassRecord {
    id: string;
    classId: string;
    subjectId: string;
    subjectName: string;
    quarter: string;
    schoolYear: string;
    
    // Configurable Grading System
    weights: {
        ww: number; // e.g., 30 for 30%
        pt: number; // e.g., 50 for 50%
        qa: number; // e.g., 20 for 20%
    };

    // Highest Possible Scores
    hpsWW: number[];
    hpsPT: number[];
    hpsQA: number;
    
    // Aggregate HPS
    totalHpsWW: number;
    totalHpsPT: number;

    students: StudentGradeRow[];
    
    lastModified: number;
}
