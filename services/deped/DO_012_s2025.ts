
export const SY_START = '2025-06-16'; // June 16, 2025 (Monday)
export const SY_END = '2026-03-31';   // March 31, 2026 (Tuesday)

export interface DepEdEvent {
    title: string;
    description: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    type: 'holiday' | 'exam' | 'break' | 'activity' | 'term';
    isNoClass: boolean;
}

export const DEPED_EVENTS_2025: DepEdEvent[] = [
    // --- QUARTERS & TERMS ---
    {
        title: 'Start of Academic Quarter 1',
        description: 'Beginning of the First Quarter for SY 2025-2026',
        startDate: '2025-06-16',
        endDate: '2025-06-16',
        type: 'term',
        isNoClass: false
    },
    {
        title: 'End of Academic Quarter 1',
        description: 'Conclusion of the First Quarter',
        startDate: '2025-08-22',
        endDate: '2025-08-22',
        type: 'term',
        isNoClass: false
    },
    {
        title: 'Start of Academic Quarter 2',
        description: 'Beginning of the Second Quarter',
        startDate: '2025-08-25',
        endDate: '2025-08-25',
        type: 'term',
        isNoClass: false
    },
    {
        title: 'End of Academic Quarter 2',
        description: 'Conclusion of the Second Quarter',
        startDate: '2025-10-24',
        endDate: '2025-10-24',
        type: 'term',
        isNoClass: false
    },
    {
        title: 'Start of Academic Quarter 3',
        description: 'Beginning of the Third Quarter',
        startDate: '2025-11-03',
        endDate: '2025-11-03',
        type: 'term',
        isNoClass: false
    },
    {
        title: 'End of Academic Quarter 3',
        description: 'Conclusion of the Third Quarter',
        startDate: '2026-01-23',
        endDate: '2026-01-23',
        type: 'term',
        isNoClass: false
    },
    {
        title: 'Start of Academic Quarter 4',
        description: 'Beginning of the Fourth Quarter',
        startDate: '2026-01-26',
        endDate: '2026-01-26',
        type: 'term',
        isNoClass: false
    },
    {
        title: 'End of Academic Quarter 4 (Graduating)',
        description: 'Conclusion of the Fourth Quarter for Grades 6, 10, 12',
        startDate: '2026-03-20', // Approx based on exam dates
        endDate: '2026-03-20',
        type: 'term',
        isNoClass: false
    },
    {
        title: 'End of School Year (Non-Graduating)',
        description: 'Last Class Day for SY 2025-2026',
        startDate: '2026-03-31',
        endDate: '2026-03-31',
        type: 'term',
        isNoClass: false
    },

    // --- BREAKS ---
    {
        title: 'Mid-School Year Break (Semestral Break)',
        description: 'To allow learners to recharge and teachers to engage in INSET.',
        startDate: '2025-10-27',
        endDate: '2025-10-31',
        type: 'break',
        isNoClass: true
    },
    {
        title: 'Christmas Break',
        description: 'Holiday break for students and teachers.',
        startDate: '2025-12-20',
        endDate: '2026-01-04',
        type: 'break',
        isNoClass: true
    },

    // --- EXAMINATIONS ---
    {
        title: 'Academic Quarter 1 Examination',
        description: 'Periodical Exams for Q1',
        startDate: '2025-08-21', // Adjusted to Thurs-Fri if 22 is Fri
        endDate: '2025-08-22',
        type: 'exam',
        isNoClass: false
    },
    {
        title: 'Academic Quarter 2 Examination',
        description: 'Periodical Exams for Q2',
        startDate: '2025-10-23',
        endDate: '2025-10-24',
        type: 'exam',
        isNoClass: false
    },
    {
        title: 'Academic Quarter 3 Examination',
        description: 'Periodical Exams for Q3',
        startDate: '2026-01-22',
        endDate: '2026-01-23',
        type: 'exam',
        isNoClass: false
    },
    {
        title: 'Academic Quarter 4 Examination (Grades 6, 10, 12)',
        description: 'Final Exams for Graduating Students',
        startDate: '2026-03-19',
        endDate: '2026-03-20',
        type: 'exam',
        isNoClass: false
    },
    {
        title: 'Academic Quarter 4 Examination (Grades 1-5, 7-9, 11)',
        description: 'Final Exams for Non-Graduating Students',
        startDate: '2026-03-26',
        endDate: '2026-03-27',
        type: 'exam',
        isNoClass: false
    },

    // --- HOLIDAYS (2025-2026) ---
    // Note: Some dates are estimates or based on Regular Holiday Law
    {
        title: 'Independence Day',
        description: 'Regular Holiday',
        startDate: '2025-06-12',
        endDate: '2025-06-12',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Eid al-Adha',
        description: 'Regular Holiday (Date Varied)',
        startDate: '2025-06-06', // Placeholder, usually early June
        endDate: '2025-06-06',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Ninoy Aquino Day',
        description: 'Special Non-Working Holiday',
        startDate: '2025-08-21',
        endDate: '2025-08-21',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'National Heroes Day',
        description: 'Regular Holiday',
        startDate: '2025-08-25',
        endDate: '2025-08-25',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'All Saints\' Day',
        description: 'Special Non-Working Holiday',
        startDate: '2025-11-01',
        endDate: '2025-11-01',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'All Souls\' Day',
        description: 'Additional Special Non-Working Holiday',
        startDate: '2025-11-02',
        endDate: '2025-11-02',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Bonifacio Day',
        description: 'Regular Holiday',
        startDate: '2025-11-30',
        endDate: '2025-11-30',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Feast of Immaculate Conception',
        description: 'Special Non-Working Holiday',
        startDate: '2025-12-08',
        endDate: '2025-12-08',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Christmas Day',
        description: 'Regular Holiday',
        startDate: '2025-12-25',
        endDate: '2025-12-25',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Rizal Day',
        description: 'Regular Holiday',
        startDate: '2025-12-30',
        endDate: '2025-12-30',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'New Year\'s Day',
        description: 'Regular Holiday',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Chinese New Year',
        description: 'Special Non-Working Holiday',
        startDate: '2026-02-17', // Estimate
        endDate: '2026-02-17',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'EDSA People Power Revolution Anniversary',
        description: 'Special Non-Working Holiday',
        startDate: '2026-02-25',
        endDate: '2026-02-25',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Maundy Thursday',
        description: 'Regular Holiday',
        startDate: '2026-04-02', // After school year, but included for completeness if late
        endDate: '2026-04-02',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Good Friday',
        description: 'Regular Holiday',
        startDate: '2026-04-03',
        endDate: '2026-04-03',
        type: 'holiday',
        isNoClass: true
    },
    {
        title: 'Araw ng Kagitingan',
        description: 'Regular Holiday',
        startDate: '2026-04-09',
        endDate: '2026-04-09',
        type: 'holiday',
        isNoClass: true
    }
];
