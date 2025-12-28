import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { db } from '../firebase';

export interface AcademicConfig {
    // Calendar
    // Calendar
    schoolYears: string[];
    examTitles: string[];
    quarters: string[];        // e.g. "1st Quarter", "2nd Quarter"
    semesters: string[];       // e.g. "1st Semester", "2nd Semester"

    // Organization & Location
    regions: string[];
    divisions: string[];
    districts: string[];

    // Curriculum & Standards
    curriculumTypes: string[]; // e.g. "K-12", "ALS"
    gradeLevels: string[];     // e.g. "Grade 11", "Grade 12"
    departments: string[];     // e.g. "Science", "Mathematics"
    shsClassifications: string[]; // e.g. "Core", "Applied", "Specialized"
    tracks: string[];          // e.g. "Academic", "TVL"
    strands: string[];         // e.g. "STEM", "HUMSS"
    roomTypes: string[];       // e.g. "Instructional", "Laboratory"
    roomConditions: string[];  // e.g. "Good", "Needs Repair"
    sectionNames: string[];    // Standardized section names (optional)

    // TOS & Assessment
    questionTypes: string[];   // e.g. "Multiple Choice", "Essay"
    cognitiveLevels: string[]; // e.g. "Remembering", "Understanding"

    // Student Profile
    motherTongues: string[];
    studentRemarks: string[];  // Standardized remarks
}

// Default Configuration to ensure the app works even with empty DB
const DEFAULT_CONFIG: AcademicConfig = {
    schoolYears: ['2024-2025', '2025-2026'],
    examTitles: ['First Periodical Examination', 'Second Periodical Examination', 'Third Periodical Examination', 'Fourth Periodical Examination'],
    quarters: ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'],
    semesters: ['1st Semester', '2nd Semester'],
    regions: [],
    divisions: [],
    districts: [],
    curriculumTypes: ['K-12', 'ALS', 'SPED'],
    gradeLevels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
    departments: ['Science', 'Mathematics', 'English', 'Filipino', 'Araling Panlipunan', 'TLE', 'MAPEH', 'ESP', 'Senior High School'],
    shsClassifications: ['Core', 'Applied', 'Specialized'],
    tracks: ['Academic', 'TVL', 'Sports', 'Arts and Design'],
    strands: ['STEM', 'ABM', 'HUMSS', 'GAS', 'ICT', 'Home Economics', 'Industrial Arts', 'Agri-Fishery Arts'],
    roomTypes: ['Instructional', 'Laboratory', 'Library', 'Clinic', 'Office', 'ICT Lab', 'Other'],
    roomConditions: ['Good', 'Needs Repair', 'Condemned'],
    sectionNames: [],
    questionTypes: ['Multiple Choice', 'True or False', 'Identification', 'Essay'],
    cognitiveLevels: ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'],
    motherTongues: ['Tagalog', 'Cebuano', 'Ilocano', 'Hiligaynon', 'Waray', 'Bicolano'],
    studentRemarks: ['Promoted', 'Retained', 'Conditional', 'Transferred Out', 'Transferred In', 'Dropped']
};

const getConfigRef = () => db.ref('system_settings/academic_config');

export const getAcademicConfig = async (): Promise<AcademicConfig> => {
    try {
        const snapshot = await getConfigRef().once('value');
        if (snapshot.exists()) {
            // Merge with defaults to ensure all fields exist
            return { ...DEFAULT_CONFIG, ...snapshot.val() };
        }
        return DEFAULT_CONFIG;
    } catch (error) {
        console.error("Failed to load academic config:", error);
        return DEFAULT_CONFIG;
    }
};

export const saveAcademicConfig = async (config: AcademicConfig): Promise<void> => {
    try {
        await getConfigRef().set(config);
    } catch (error) {
        console.error("Failed to save academic config:", error);
        throw error;
    }
};

export const subscribeToAcademicConfig = (callback: (config: AcademicConfig) => void): () => void => {
    const ref = getConfigRef();
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        if (snapshot.exists()) {
            callback({ ...DEFAULT_CONFIG, ...snapshot.val() });
        } else {
            callback(DEFAULT_CONFIG);
        }
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
};
