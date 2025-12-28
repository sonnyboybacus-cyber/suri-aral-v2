
import React, { useState, useEffect } from 'react';
import { HomeIcon, UsersIcon, BrainCircuitIcon, BriefcaseIcon, LibraryIcon, SchoolIcon, UserIcon, MessageSquareIcon, MegaphoneIcon, HistoryIcon, BellIcon, SettingsIcon, PenToolIcon, BookOpenIcon, ChevronDownIcon, CalendarCheckIcon, SidebarIcon, PieChartIcon, HourglassIcon, BarChart3Icon, MicIcon, PuzzleIcon, XIcon, FileSpreadsheetIcon, CalendarIcon, LayoutDashboard, KeyIcon, FolderIcon, LockIcon } from './icons';
import { UserRole, View, UserProfile } from '../types';
import { canAccessView, PERMISSION_MATRIX, VIEW_PERMISSIONS } from '../config/PermissionMatrix';

interface SideNavProps {
  activeView: View;
  setActiveView: (view: View) => void;
  role: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
  hiddenOnDesktop?: boolean;
  user: any;
  userProfile?: UserProfile | null;
}


const GROUP_MAPPING: Record<string, string> = {
  // Core
  dashboard: 'admin', // Keep admin group open on dashboard for admins

  // Admin Group
  adminProfile: 'admin',
  schoolInformation: 'admin',
  accountInformation: 'admin',
  activityLog: 'admin',
  academicConfig: 'admin',

  // Academic Group
  studentRegistration: 'academic',
  teacherInformation: 'academic',
  classInformation: 'academic',
  subjectManagement: 'academic',
  classRecord: 'academic',
  masterSchedule: 'academic',
  resources: 'academic',

  // Communication Group
  announcements: 'communication',
  notifications: 'communication',

  // Teaching Group
  lessonPlanner: 'teaching',
  itemAnalysis: 'teaching',
  questionBank: 'teaching',
  tos: 'teaching',
  learnSA: 'teaching',
  studyPlanner: 'teaching',
  historySA: 'teaching',
  dataSA: 'teaching',
  readingSA: 'teaching',
  quizSA: 'teaching'
};

const NavItem = ({
  icon,
  label,
  isActive,
  onClick,
  isCollapsed,
  locked = false
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
  locked?: boolean;
}) => (
  <li>
    <button
      onClick={onClick}
      title={locked ? "Access Restricted" : (isCollapsed ? label : undefined)}
      className={`flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
        : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:text-slate-900 dark:hover:text-white'
        } ${isCollapsed ? 'justify-center' : ''} ${locked ? 'opacity-60 grayscale cursor-pointer' : ''}`}
    >
      <span className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'} ${isCollapsed ? 'mr-0' : 'mr-3'} relative`}>
        {icon}
        {locked && (
          <div className="absolute -top-1 -right-1 bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 border border-slate-300 dark:border-slate-600">
            <LockIcon className="w-2.5 h-2.5 text-slate-500" />
          </div>
        )}
      </span>
      {!isCollapsed && (
        <div className="flex-1 text-left flex items-center justify-between">
          <span className="truncate">{label}</span>
          {locked && <LockIcon className="w-3 h-3 text-slate-400 ml-2" />}
        </div>
      )}
    </button>
  </li>
);

const NavGroup = ({
  title,
  children,
  isOpen,
  onToggle,
  isCollapsed
}: {
  title: string;
  children?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
}) => {
  const showChildren = isCollapsed || isOpen;

  return (
    <div className="mb-2">
      {isCollapsed ? (
        <div className="h-px bg-slate-200 dark:bg-slate-700 my-4 mx-4" title={title} />
      ) : (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
        >
          <span className="truncate">{title}</span>
          <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-300 group-hover:text-indigo-400'}`} />
        </button>
      )}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${showChildren ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <ul className={`space-y-1 pb-2 ${isCollapsed ? '' : 'pl-1 border-l-2 border-slate-100 dark:border-slate-800 ml-2'}`}>
          {children}
        </ul>
      </div>
    </div>
  );
};

const SideNav = ({ activeView, setActiveView, role, isOpen = false, onClose, hiddenOnDesktop = false, user, userProfile }: SideNavProps) => {

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    admin: true,
    academic: true,
    communication: false,
    teaching: false
  });

  useEffect(() => {
    if (!isCollapsed) {
      const groupId = GROUP_MAPPING[activeView];
      if (groupId) {
        setOpenGroups(prev => ({ ...prev, [groupId]: true }));
      }
    }
  }, [activeView, isCollapsed]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleNavClick = (view: View) => {
    setActiveView(view);
    if (onClose) onClose();
  };

  const getLinkState = (view: View, relevantRoles: UserRole[] = []) => {
    // 1. Check if view is relevant to the user's role (Broad visibility)
    // If relevantRoles is empty, assume relevant to all
    const isRelevant = relevantRoles.length === 0 || relevantRoles.includes(role);

    // 2. Check if user currently has permission (Strict access)
    const hasAccess = canAccessView(role, view, userProfile);

    // 3. Logic:
    // If has Access -> Visible & Unlocked
    // If Relevant but No Access -> Visible & Locked
    // If Not Relevant & No Access -> Hidden

    if (hasAccess) return { visible: true, locked: false };

    // User requested to hide restricted items instead of showing lock icon
    return { visible: false, locked: true };
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        ></div>
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 h-full flex flex-col transition-all duration-500 ease-in-out
        bg-slate-50/95 dark:bg-slate-900/95 md:bg-slate-50/80 md:dark:bg-slate-900/80 
        backdrop-blur-xl border-r border-slate-200 dark:border-slate-800
        ${isOpen ? 'translate-x-0 w-72' : `-translate-x-full ${hiddenOnDesktop ? '' : 'md:translate-x-0'}`}
        ${isCollapsed ? 'md:w-20' : 'md:w-72'}
      `}>
        <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>

        <div className={`relative flex items-center ${isCollapsed ? 'justify-center px-0 flex-col gap-4' : 'justify-between px-4'} py-4 mb-2 transition-all duration-500`}>

          <div className="flex items-center gap-3">
            <div className="group relative cursor-pointer perspective-1000" onClick={() => isCollapsed && setIsCollapsed(false)}>
              <div className={`relative duration-700 preserve-3d group-hover:rotate-y-180 transition-all ease-out w-10 h-10`}>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center backface-hidden z-20 border border-white/10 overflow-hidden">
                  <img src="/DivisionLogo.png" alt="Division Logo" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-slate-900 rounded-full shadow-lg flex items-center justify-center backface-hidden rotate-y-180 border border-slate-700">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.9)] animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className={`flex flex-col overflow-hidden transition-all duration-500 ease-out ${isCollapsed ? 'w-0 opacity-0 ml-0 hidden' : 'flex-1 opacity-100'}`}>
              <h1 className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 dark:from-white dark:via-indigo-300 dark:to-white truncate leading-none">
                SURI-ARAL
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] truncate">
                  AI Learning Suite
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XIcon className="w-6 h-6" />
          </button>

          {!hiddenOnDesktop && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden md:block p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all duration-300 ${isCollapsed ? 'rotate-180 mt-2 bg-slate-100 dark:bg-slate-800' : ''}`}
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <SidebarIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mb-6 flex-shrink-0 px-4">
          <button
            onClick={() => handleNavClick('dashboard')}
            title={isCollapsed ? "Dashboard" : undefined}
            className={`flex items-center w-full px-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 border ${activeView === 'dashboard'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <HomeIcon className={`w-5 h-5 ${isCollapsed ? 'mr-0' : 'mr-3'} ${activeView === 'dashboard' ? 'text-white dark:text-slate-900' : 'text-slate-500'}`} />
            {!isCollapsed && "Dashboard"}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">

          {/* ADMIN GROUP */}
          {(() => {
            const schoolInfo = getLinkState('schoolInformation', ['admin', 'principal', 'ict_coordinator']);
            const accountInfo = getLinkState('accountInformation', ['admin', 'ict_coordinator']);
            const logs = getLinkState('activityLog', ['admin']);
            const acadConfig = getLinkState('academicConfig', ['admin']);
            // Group visible if at least one item is visible
            const showGroup = schoolInfo.visible || accountInfo.visible || logs.visible || acadConfig.visible;

            if (!showGroup) return null;

            return (
              <NavGroup
                title="Administration"
                isOpen={openGroups.admin}
                onToggle={() => toggleGroup('admin')}
                isCollapsed={isCollapsed}
              >
                {schoolInfo.visible && (
                  <NavItem
                    icon={<SchoolIcon />}
                    label="School Profile"
                    isActive={activeView === 'schoolInformation'}
                    onClick={() => handleNavClick('schoolInformation')}
                    isCollapsed={isCollapsed}
                    locked={schoolInfo.locked}
                  />
                )}
                {accountInfo.visible && (
                  <NavItem
                    icon={<KeyIcon />}
                    label="Access Management"
                    isActive={activeView === 'accountInformation'}
                    onClick={() => handleNavClick('accountInformation')}
                    isCollapsed={isCollapsed}
                    locked={accountInfo.locked}
                  />
                )}
                {logs.visible && (
                  <NavItem
                    icon={<HistoryIcon />}
                    label="System Logs"
                    isActive={activeView === 'activityLog'}
                    onClick={() => handleNavClick('activityLog')}
                    isCollapsed={isCollapsed}
                    locked={logs.locked}
                  />
                )}
                {acadConfig.visible && (
                  <NavItem
                    icon={<SettingsIcon />} // Recycling SettingsIcon since it fits well
                    label="Academic Config"
                    isActive={activeView === 'academicConfig'}
                    onClick={() => handleNavClick('academicConfig')}
                    isCollapsed={isCollapsed}
                    locked={acadConfig.locked}
                  />
                )}
              </NavGroup>
            );
          })()}

          {/* ACADEMIC MANAGEMENT GROUP */}
          {(() => {
            // Broad relevancy for teachers to see these tools even if locked
            const ms = getLinkState('masterSchedule', ['admin', 'principal', 'teacher', 'ict_coordinator']);
            const cr = getLinkState('classRecord', ['admin', 'principal', 'teacher']);
            const sr = getLinkState('studentRegistration', ['admin', 'principal', 'ict_coordinator', 'teacher']);
            const ti = getLinkState('teacherInformation', ['admin', 'principal', 'teacher']);
            const ci = getLinkState('classInformation', ['admin', 'principal', 'teacher', 'ict_coordinator', 'student']);
            const sm = getLinkState('subjectManagement', ['admin', 'ict_coordinator', 'teacher']);
            const res = getLinkState('resources', []); // All

            const showGroup = ms.visible || cr.visible || sr.visible || ti.visible || ci.visible || sm.visible || res.visible;
            if (!showGroup) return null;

            return (
              <NavGroup
                title="Academic Management"
                isOpen={openGroups.academic}
                onToggle={() => toggleGroup('academic')}
                isCollapsed={isCollapsed}
              >
                {ms.visible && (
                  <NavItem
                    icon={<CalendarIcon />}
                    label="Master Schedule"
                    isActive={activeView === 'masterSchedule'}
                    onClick={() => handleNavClick('masterSchedule')}
                    isCollapsed={isCollapsed}
                    locked={ms.locked}
                  />
                )}
                {res.visible && (
                  <NavItem
                    icon={<FolderIcon />}
                    label="Shared Resources"
                    isActive={activeView === 'resources'}
                    onClick={() => handleNavClick('resources')}
                    isCollapsed={isCollapsed}
                    locked={res.locked}
                  />
                )}
                {cr.visible && role !== 'teacher' && (
                  <NavItem
                    icon={<FileSpreadsheetIcon />}
                    label="Class Record"
                    isActive={activeView === 'classRecord'}
                    onClick={() => handleNavClick('classRecord')}
                    isCollapsed={isCollapsed}
                    locked={cr.locked}
                  />
                )}
                {sr.visible && (
                  <NavItem
                    icon={<UsersIcon />}
                    label="Student Information"
                    isActive={activeView === 'studentRegistration'}
                    onClick={() => handleNavClick('studentRegistration')}
                    isCollapsed={isCollapsed}
                    locked={sr.locked}
                  />
                )}
                {ti.visible && (
                  <NavItem
                    icon={<BriefcaseIcon />}
                    label="Teacher Information"
                    isActive={activeView === 'teacherInformation'}
                    onClick={() => handleNavClick('teacherInformation')}
                    isCollapsed={isCollapsed}
                    locked={ti.locked}
                  />
                )}
                {ci.visible && (
                  <NavItem
                    icon={<LibraryIcon />}
                    label={role === 'student' ? "My Classes" : "Class Information"}
                    isActive={activeView === 'classInformation'}
                    onClick={() => handleNavClick('classInformation')}
                    isCollapsed={isCollapsed}
                    locked={ci.locked}
                  />
                )}
                {sm.visible && (
                  <NavItem
                    icon={<BookOpenIcon />}
                    label="Subject Management"
                    isActive={activeView === 'subjectManagement'}
                    onClick={() => handleNavClick('subjectManagement')}
                    isCollapsed={isCollapsed}
                    locked={sm.locked}
                  />
                )}
              </NavGroup>
            );
          })()}

          {/* COMMUNICATION GROUP */}
          {(() => {
            const ann = getLinkState('announcements', []); // All
            const not = getLinkState('notifications', []); // All
            return (
              <NavGroup
                title="Communication Hub"
                isOpen={openGroups.communication}
                onToggle={() => toggleGroup('communication')}
                isCollapsed={isCollapsed}
              >
                {ann.visible && <NavItem icon={<MegaphoneIcon />} label="Announcements" isActive={activeView === 'announcements'} onClick={() => handleNavClick('announcements')} isCollapsed={isCollapsed} locked={ann.locked} />}
                {not.visible && <NavItem icon={<BellIcon />} label="Notifications" isActive={activeView === 'notifications'} onClick={() => handleNavClick('notifications')} isCollapsed={isCollapsed} locked={not.locked} />}
              </NavGroup>
            );
          })()}

          {/* AI AUGMENTED TOOLS GROUP */}
          {(() => {
            // Generally relevant for Admin, Principal, Teacher, Student (some)
            const learn = getLinkState('learnSA', []);
            const res = getLinkState('resources', []);
            const lesson = getLinkState('lessonPlanner', ['admin', 'teacher', 'principal']);
            const item = getLinkState('itemAnalysis', ['admin', 'teacher', 'principal']);
            const hist = getLinkState('historySA', []);
            const data = getLinkState('dataSA', ['admin', 'teacher', 'principal']);
            const read = getLinkState('readingSA', []);
            const quiz = getLinkState('quizSA', []);
            const study = getLinkState('studyPlanner', []);
            const qBank = getLinkState('questionBank', ['admin', 'teacher', 'principal']);
            const tosView = getLinkState('tos', ['admin', 'teacher', 'principal']);

            const showGroup = learn.visible || res.visible || lesson.visible; // etc

            return (
              <NavGroup
                title="AI Augmented Tools"
                isOpen={openGroups.teaching}
                onToggle={() => toggleGroup('teaching')}
                isCollapsed={isCollapsed}
              >
                {learn.visible && <NavItem icon={<BrainCircuitIcon />} label="Learn SA" isActive={activeView === 'learnSA'} onClick={() => handleNavClick('learnSA')} isCollapsed={isCollapsed} locked={learn.locked} />}
                {lesson.visible && <NavItem icon={<PenToolIcon />} label="Smart Lesson Planner" isActive={activeView === 'lessonPlanner'} onClick={() => handleNavClick('lessonPlanner')} isCollapsed={isCollapsed} locked={lesson.locked} />}
                {item.visible && <NavItem icon={<PieChartIcon />} label="Item Analysis AI" isActive={activeView === 'itemAnalysis'} onClick={() => handleNavClick('itemAnalysis')} isCollapsed={isCollapsed} locked={item.locked} />}
                {qBank.visible && <NavItem icon={<BookOpenIcon />} label="Question Bank" isActive={activeView === 'questionBank'} onClick={() => handleNavClick('questionBank')} isCollapsed={isCollapsed} locked={qBank.locked} />}
                {tosView.visible && <NavItem icon={<FileSpreadsheetIcon />} label="Table of Specifications" isActive={activeView === 'tos'} onClick={() => handleNavClick('tos')} isCollapsed={isCollapsed} locked={tosView.locked} />}
                {hist.visible && <NavItem icon={<HourglassIcon />} label="History SA" isActive={activeView === 'historySA'} onClick={() => handleNavClick('historySA')} isCollapsed={isCollapsed} locked={hist.locked} />}
                {data.visible && <NavItem icon={<BarChart3Icon />} label="Data SA" isActive={activeView === 'dataSA'} onClick={() => handleNavClick('dataSA')} isCollapsed={isCollapsed} locked={data.locked} />}
                {read.visible && <NavItem icon={<MicIcon />} label="Reading SA" isActive={activeView === 'readingSA'} onClick={() => handleNavClick('readingSA')} isCollapsed={isCollapsed} locked={read.locked} />}
                {quiz.visible && <NavItem icon={<PuzzleIcon />} label="Quiz SA" isActive={activeView === 'quizSA'} onClick={() => handleNavClick('quizSA')} isCollapsed={isCollapsed} locked={quiz.locked} />}
                {study.visible && <NavItem icon={<CalendarCheckIcon />} label="Study Calendar" isActive={activeView === 'studyPlanner'} onClick={() => handleNavClick('studyPlanner')} isCollapsed={isCollapsed} locked={study.locked} />}
              </NavGroup>
            );
          })()}

        </nav>

        <div className={`p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 ${hiddenOnDesktop ? '' : ''}`}>
          <button
            onClick={() => handleNavClick('settings_profile')} // Redirect to Settings > Profile
            className="group flex flex-col items-center justify-center p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-center w-full"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2 ring-2 ring-transparent group-hover:ring-indigo-500 transition-all">
              {user?.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">{user?.displayName?.charAt(0)}</div>}
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">My Profile</p>
          </button>
        </div>

      </aside>
    </>
  );
};

export default SideNav;
