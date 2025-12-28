
import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { ClassRecord } from '../../types/grading';
import { parseSnapshot } from './core';

const getClassRecordsRef = (userId: string) => db.ref(`users/${userId}/class_records`);

export const saveClassRecord = async (userId: string, record: ClassRecord) => {
    const ref = getClassRecordsRef(userId);
    // If ID exists, update, else push new
    if (record.id) {
        await ref.child(record.id).set({
            ...record,
            lastModified: firebase.database.ServerValue.TIMESTAMP
        });
        return record.id;
    } else {
        const newRef = ref.push();
        await newRef.set({
            ...record,
            id: newRef.key,
            lastModified: firebase.database.ServerValue.TIMESTAMP
        });
        return newRef.key;
    }
};

export const loadClassRecords = async (userId: string): Promise<ClassRecord[]> => {
    const ref = getClassRecordsRef(userId);
    const snapshot = await ref.once('value');
    return parseSnapshot<ClassRecord>(snapshot);
};

export const loadClassRecord = async (userId: string, recordId: string): Promise<ClassRecord | null> => {
    const ref = getClassRecordsRef(userId).child(recordId);
    const snapshot = await ref.once('value');
    return snapshot.exists() ? snapshot.val() as ClassRecord : null;
};

export const deleteClassRecord = async (userId: string, recordId: string) => {
    await getClassRecordsRef(userId).child(recordId).remove();
};

export interface StudentYearlySummary {
    studentId: string;
    studentName: string;
    sex: 'Male' | 'Female';
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    finalRating: number;
    action: 'Passed' | 'Failed';
}

export const loadClassSummary = async (userId: string, classId: string, subjectId: string): Promise<StudentYearlySummary[]> => {
    const records = await loadClassRecords(userId);
    const quarters = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];

    // map studentId -> summary
    const summaryMap = new Map<string, StudentYearlySummary>();

    // We need to know who the students are. Ideally, we take the union of all students in all retrieved quarters.
    const targetRecords = records.filter(r => r.classId === classId && r.subjectId === subjectId);

    targetRecords.forEach(rec => {
        rec.students.forEach(s => {
            if (!summaryMap.has(s.studentId)) {
                summaryMap.set(s.studentId, {
                    studentId: s.studentId,
                    studentName: s.studentName,
                    sex: s.gender,
                    q1: 0, q2: 0, q3: 0, q4: 0,
                    finalRating: 0,
                    action: 'Passed' // Default
                });
            }

            const entry = summaryMap.get(s.studentId)!;
            if (rec.quarter === '1st Quarter') entry.q1 = s.quarterlyGrade;
            if (rec.quarter === '2nd Quarter') entry.q2 = s.quarterlyGrade;
            if (rec.quarter === '3rd Quarter') entry.q3 = s.quarterlyGrade;
            if (rec.quarter === '4th Quarter') entry.q4 = s.quarterlyGrade;
        });
    });

    // Calculate Final and Action
    const result = Array.from(summaryMap.values()).map(s => {
        // Count non-zero quarters for average? Or just sum/4? Standard is usually Average of 4.
        // If a quarter is missing, it's 0, dragging down the average (correct for "incomplete").
        const average = Math.round((s.q1 + s.q2 + s.q3 + s.q4) / 4);
        return {
            ...s,
            finalRating: average,
            action: average >= 75 ? 'Passed' : 'Failed'
        };
    });

    // Sort by Gender then Name
    result.sort((a, b) => {
        if (a.sex !== b.sex) return a.sex === 'Male' ? -1 : 1;
        return a.studentName.localeCompare(b.studentName);
    });

    return result as any; // Cast generic
};
