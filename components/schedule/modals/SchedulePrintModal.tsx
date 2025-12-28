import { ClassInfo, SchoolInfo, Teacher } from '../../../types';
import { getTeacherName } from '../ScheduleUtils';
import { ClassProgramPrint } from '../../ClassProgramPrint';

interface SchedulePrintModalProps {
    printingClass: ClassInfo | null;
    schools: SchoolInfo[];
    teachers: Teacher[];
    onClose: () => void;
}

export const SchedulePrintModal: React.FC<SchedulePrintModalProps> = ({
    printingClass,
    schools,
    teachers,
    onClose
}) => {
    if (!printingClass) return null;

    const school = schools.find(s => s.id === printingClass.schoolId);
    const adviserName = getTeacherName(teachers, printingClass.adviserId);

    return (
        <ClassProgramPrint
            classInfo={printingClass}
            schedule={printingClass.schedule || []}
            school={school}
            adviserName={adviserName}
            onClose={onClose}
        />
    );
};
