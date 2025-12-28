
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { StudentSF1, Teacher, ClassInfo, SchoolInfo, Subject, UserProfile, UserRole } from '../../types';
import { db, firebaseConfig } from '../firebase';
import { parseSnapshot, generateUUID } from './core';

// --- REFS ---
const getStudentsSF1Ref = () => db.ref(`students_sf1`);
const getTeachersRef = () => db.ref(`teachers`);
const getClassesRef = () => db.ref(`classes`);
const getSchoolsRef = () => db.ref(`schools`);
const getSubjectsRef = () => db.ref(`subjects`);
const getUserProfileRef = (userId: string) => db.ref(`users/${userId}/profile`);

// Helper to remove undefined values which Firebase rejects
const sanitize = <T>(data: T): T => {
    return JSON.parse(JSON.stringify(data));
};

// Helper to convert array to object map keyed by ID
// This ensures Firebase stores data as "id": { ... } instead of "0": { ... }
const toMap = (array: any[]) => {
    const map: Record<string, any> = {};
    array.forEach(item => {
        if (item && item.id) {
            map[item.id] = sanitize(item);
        }
    });
    return map;
};

export const generateJoinCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// --- STUDENTS ---
export const saveStudents_SF1 = async (userId: string, students: StudentSF1[]): Promise<void> => {
    const studentsRef = getStudentsSF1Ref();
    await studentsRef.set(toMap(students));
};

export const saveStudent = async (userId: string, student: StudentSF1): Promise<void> => {
    const studentRef = getStudentsSF1Ref().child(student.id);
    await studentRef.set(sanitize(student));
};

export const loadStudents_SF1 = async (userId: string): Promise<StudentSF1[]> => {
    const studentsRef = getStudentsSF1Ref();
    const snapshot = await studentsRef.once('value');
    return parseSnapshot<StudentSF1>(snapshot);
};

// --- TEACHERS ---
export const saveTeachers = async (userId: string, teachers: Teacher[]): Promise<void> => {
    const teachersRef = getTeachersRef();
    await teachersRef.set(toMap(teachers));
};

export const saveTeacher = async (userId: string, teacher: Teacher): Promise<void> => {
    const teacherRef = getTeachersRef().child(teacher.id);
    await teacherRef.set(sanitize(teacher));
};

export const loadTeachers = async (userId: string): Promise<Teacher[]> => {
    const teachersRef = getTeachersRef();
    const snapshot = await teachersRef.once('value');
    return parseSnapshot<Teacher>(snapshot);
};

// --- CLASSES ---
export const saveClasses = async (userId: string, classes: ClassInfo[]): Promise<void> => {
    const classesRef = getClassesRef();
    await classesRef.set(toMap(classes));
};

export const saveClass = async (userId: string, classInfo: ClassInfo): Promise<void> => {
    const classRef = getClassesRef().child(classInfo.id);
    await classRef.set(sanitize(classInfo));
};

export const loadClasses = async (userId: string): Promise<ClassInfo[]> => {
    const classesRef = getClassesRef();
    const snapshot = await classesRef.once('value');
    return parseSnapshot<ClassInfo>(snapshot);
};

// --- SCHOOLS ---
export const saveSchools = async (userId: string, schools: SchoolInfo[]): Promise<void> => {
    const schoolsRef = getSchoolsRef();
    await schoolsRef.set(toMap(schools));
};

export const saveSchool = async (userId: string, school: SchoolInfo): Promise<void> => {
    const schoolRef = getSchoolsRef().child(school.id);
    await schoolRef.set(sanitize(school));
};

export const loadSchools = async (userId: string): Promise<SchoolInfo[]> => {
    const schoolsRef = getSchoolsRef();
    const snapshot = await schoolsRef.once('value');
    return parseSnapshot<SchoolInfo>(snapshot);
};

// --- SUBJECTS ---
export const saveSubjects = async (subjects: Subject[]): Promise<void> => {
    const subjectsRef = getSubjectsRef();
    await subjectsRef.set(toMap(subjects));
};

export const saveSubject = async (subject: Subject): Promise<void> => {
    const subjectRef = getSubjectsRef().child(subject.id);
    await subjectRef.set(sanitize(subject));
};

export const loadSubjects = async (): Promise<Subject[]> => {
    const subjectsRef = getSubjectsRef();
    const snapshot = await subjectsRef.once('value');
    return parseSnapshot<Subject>(snapshot);
};

// --- USER MANAGEMENT ---
export const createManagedUser = async (adminId: string, email: string, password: string, profileData: Omit<UserProfile, 'uid' | 'createdAt'>): Promise<string> => {
    const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
    try {
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;
        if (!newUser) throw new Error("Failed to create user");

        const userProfile: UserProfile = {
            uid: newUser.uid,
            createdAt: Date.now(),
            ...profileData
        };

        // 1. Save User Profile
        await getUserProfileRef(newUser.uid).set(userProfile);

        // 2. If Role is Teacher or Admin, Create Teacher Record
        if (profileData.role === 'teacher' || profileData.role === 'admin') {
            const newTeacher: Teacher = {
                id: generateUUID(),
                linkedAccountId: newUser.uid,
                hasAccount: true,
                email: email,
                firstName: profileData.displayName.split(' ')[0] || 'User',
                lastName: profileData.displayName.split(' ').slice(1).join(' ') || 'Name',
                middleName: '',
                extensionName: '',
                sex: 'Male', // Default
                phoneNumber: '',
                position: profileData.role === 'admin' ? 'Administrator' : 'Teacher I',
                specialization: '',
                dateOfAppointment: new Date().toISOString().split('T')[0],
                status: 'Permanent',
                schoolId: profileData.schoolId || '',
                role: profileData.role,
                employeeId: 'TBD'
            };
            // Push new teacher record
            await getTeachersRef().child(newTeacher.id).set(newTeacher);
        }

        await secondaryApp.auth().signOut();
        await secondaryApp.delete();
        return newUser.uid;
    } catch (error) {
        await secondaryApp.delete();
        throw error;
    }
};


export const registerFullUser = async (
    email: string,
    password: string,
    role: UserRole,
    profileData: any, // Typed as needed
    schoolId?: string
): Promise<void> => {
    const secondaryApp = firebase.initializeApp(firebaseConfig, "RegisterTemp");
    try {
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;
        if (!newUser) throw new Error("Failed to create user");

        // Use Secondary Auth for Database Writes
        const secDb = secondaryApp.database();
        const uid = newUser.uid;
        const fullName = `${profileData.firstName} ${profileData.lastName}`;
        const safeSchoolId = schoolId || ''; // Firebase does not allow undefined

        await newUser.updateProfile({ displayName: fullName });

        // 1. User Profile
        const profile: UserProfile = {
            uid,
            email: email || '',
            displayName: fullName,
            role,
            createdAt: Date.now(),
            schoolId: safeSchoolId
        };
        await secDb.ref(`users/${uid}/profile`).set(profile);

        // 2. Role Specific Data
        if (role === 'student') {
            const newStudent: StudentSF1 = {
                id: generateUUID(), linkedAccountId: uid, remarks: 'Self-Registered', ...profileData, schoolId: safeSchoolId
            };
            delete (newStudent as any).employeeId; delete (newStudent as any).position;
            delete (newStudent as any).specialization; delete (newStudent as any).dateOfAppointment; delete (newStudent as any).status;

            if (newStudent.birthDate) {
                const birth = new Date(newStudent.birthDate);
                const ageDifMs = Date.now() - birth.getTime();
                const ageDate = new Date(ageDifMs);
                newStudent.age = Math.abs(ageDate.getUTCFullYear() - 1970);
            } else { newStudent.age = 0; }

            await secDb.ref('students_sf1').child(newStudent.id).set(newStudent);

        } else if (role === 'teacher' || role === 'admin') {
            const newTeacher: Teacher = {
                id: generateUUID(),
                linkedAccountId: uid,
                hasAccount: true,
                email: email,
                role: role,
                // Use profileData fields directly
                firstName: profileData.firstName || 'User',
                lastName: profileData.lastName || 'Name',
                middleName: profileData.middleName || '',
                extensionName: profileData.extensionName || '',
                sex: profileData.sex || 'Male',
                phoneNumber: profileData.phoneNumber || '',
                position: profileData.position || (role === 'admin' ? 'Administrator' : 'Teacher I'),
                specialization: profileData.specialization || '',
                dateOfAppointment: profileData.dateOfAppointment || new Date().toISOString().split('T')[0],
                status: profileData.status || 'Permanent',
                schoolId: safeSchoolId, // Use the argument, not profileData
                employeeId: profileData.employeeId || 'TBD'
            };
            // Clean up internal keys if any
            delete (newTeacher as any).lrn; delete (newTeacher as any).guardianName;

            // USE SECDB (Authenticated as new user)
            await secDb.ref('teachers').child(newTeacher.id).set(newTeacher);

            // DIRECT ASSIGNMENT TO SCHOOL (As requested)
            if (safeSchoolId) {
                const schoolRef = secDb.ref(`schools/${safeSchoolId}`);
                const schoolSnap = await schoolRef.once('value');
                if (schoolSnap.exists()) {
                    const schoolData = schoolSnap.val();
                    const existingIds = schoolData.assignedTeacherIds || [];
                    if (!existingIds.includes(newTeacher.id)) {
                        const updatedIds = [...existingIds, newTeacher.id];
                        await schoolRef.child('assignedTeacherIds').set(updatedIds);
                    }
                }
            }
        }

        await secondaryApp.auth().signOut();
        await secondaryApp.delete();
    } catch (error) {
        await secondaryApp.delete();
        throw error;
    }
};

export const listManagedUsers = async (adminId: string): Promise<UserProfile[]> => {
    try {
        const usersRef = db.ref('users');
        const snapshot = await usersRef.once('value');
        if (snapshot.exists()) {
            const usersData = snapshot.val();
            return Object.values(usersData).map((u: any) => u.profile).filter(p => p);
        }
        return [];
    } catch (error) {
        return [];
    }
};

export const initializeUserProfile = async (user: firebase.User, displayName: string, role: UserRole, schoolId?: string) => {
    const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName,
        role,
        createdAt: Date.now(),
        schoolId: schoolId
    };
    await getUserProfileRef(user.uid).set(profile);
};

export const subscribeToUserStatus = (userId: string, callback: (profile: UserProfile | null) => void) => {
    const userRef = getUserProfileRef(userId);
    const handler = (snapshot: firebase.database.DataSnapshot) => {
        if (snapshot.exists()) {
            const val = snapshot.val();
            callback(val as UserProfile);
        } else {
            callback(null);
        }
    };
    userRef.on('value', handler);
    return () => userRef.off('value', handler);
};

export const syncTeacherAccountLink = async (user: firebase.User) => {
    if (!user.email) return;

    try {
        const teachersRef = getTeachersRef();
        const snapshot = await teachersRef.once('value');

        if (snapshot.exists()) {
            const teachers = Object.values(snapshot.val()) as Teacher[];
            const match = teachers.find(t => t.email && t.email.toLowerCase() === user.email!.toLowerCase());

            if (match && (!match.linkedAccountId || match.linkedAccountId !== user.uid)) {
                // Update only the specific teacher record
                const teacherRef = teachersRef.child(match.id);
                await teacherRef.update({ linkedAccountId: user.uid, hasAccount: true });
            }
        }
    } catch (error) {
        // Suppress permission errors for non-admin users who can't read/write teacher list
        // console.warn("Teacher sync skipped/failed:", error);
    }
};

export const updateTeacherAccountStatus = async (teacherId: string, updates: { linkedAccountId?: string, hasAccount?: boolean }) => {
    const teacherRef = getTeachersRef().child(teacherId);
    await teacherRef.update(updates);
};

export const ensureTeacherRecord = async (user: firebase.User, role: UserRole) => {
    if (role !== 'admin' && role !== 'teacher') return;

    try {
        const teachersRef = getTeachersRef();
        const snapshot = await teachersRef.orderByChild('linkedAccountId').equalTo(user.uid).once('value');
        let exists = snapshot.exists();

        // Double check by email if not found by ID (legacy accounts)
        if (!exists && user.email) {
            const allSnapshot = await teachersRef.orderByChild('email').equalTo(user.email).once('value');
            if (allSnapshot.exists()) exists = true;
        }

        if (!exists) {
            console.log("Teacher/Admin profile missing. Auto-generating default record...");
            const displayName = user.displayName || 'User';
            const names = displayName.split(' ');
            const lastName = names.length > 1 ? names.pop() || 'User' : 'User';
            const firstName = names.join(' ') || 'System';

            const newProfile: Teacher = {
                id: generateUUID(),
                employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                firstName,
                lastName,
                middleName: '',
                extensionName: '',
                sex: 'Male',
                email: user.email || '',
                phoneNumber: '',
                position: role === 'admin' ? 'System Administrator' : 'Teacher',
                specialization: 'General',
                dateOfAppointment: new Date().toISOString().split('T')[0],
                status: 'Permanent',
                linkedAccountId: user.uid,
                hasAccount: true,
                schoolId: '',
                role: role
            };

            await saveTeacher(user.uid, newProfile);
            console.log("Self-healing successful: Teacher record created.");
        } else {
            // Check if deleted and restore
            snapshot.forEach(child => {
                const t = child.val();
                if (t.deletedAt) {
                    console.log("Restoring deleted teacher record for logged in user...");
                    child.ref.child('deletedAt').remove();
                }
            });
        }
    } catch (e) {
        console.warn("Self-healing check failed (harmless if permission denied):", e);
    }
};

// --- JOIN CLASS ---
export const joinClassByCode = async (userId: string, joinCode: string): Promise<{ success: boolean; message: string }> => {
    if (!joinCode || joinCode.length < 6) return { success: false, message: "Invalid code format." };

    try {
        // 1. Find Class by Code
        const classesRef = getClassesRef();
        const snapshot = await classesRef.orderByChild('joinCode').equalTo(joinCode).once('value');

        if (!snapshot.exists()) {
            return { success: false, message: "Class not found." };
        }

        const classData = Object.values(snapshot.val())[0] as ClassInfo;
        const classId = Object.keys(snapshot.val())[0]; // Get the actual key since we queried

        // 2. Get User Profile for School Check
        const userSnapshot = await getUserProfileRef(userId).once('value');
        const userProfile = userSnapshot.val() as UserProfile;

        if (!userProfile) return { success: false, message: "User profile error." };

        // 3. School Isolation Check
        // If user has a schoolId, strictly enforce match. If admin (no schoolId), maybe allow? 
        // Assuming students MUST have a schoolId.
        if (userProfile.schoolId && userProfile.schoolId !== classData.schoolId) {
            return { success: false, message: "You cannot join a class from a different school." };
        }

        // 4. Check if already joined
        const currentStudents = classData.studentIds || [];
        if (currentStudents.includes(userId)) {
            return { success: false, message: "You are already in this class." };
        }

        // 5. Add Student
        const updatedStudents = [...currentStudents, userId];
        await classesRef.child(classId).child('studentIds').set(updatedStudents);

        return { success: true, message: `Successfully joined ${classData.gradeLevel} - ${classData.section}` };

    } catch (error) {
        console.error("Join Class Error:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
};
