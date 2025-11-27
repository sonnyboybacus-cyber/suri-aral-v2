
import React, { useState, useEffect } from 'react';
import { HomeIcon, UsersIcon, BrainCircuitIcon, BriefcaseIcon, LibraryIcon, SchoolIcon, UserIcon, MessageSquareIcon, MegaphoneIcon, HistoryIcon, BellIcon, SettingsIcon, PenToolIcon, BookOpenIcon, ChevronDownIcon, CalendarCheckIcon, SidebarIcon, PieChartIcon, HourglassIcon, BarChart3Icon, MicIcon, PuzzleIcon } from './icons';
import { UserRole, View } from '../types';

interface SideNavProps {
  activeView: View;
  setActiveView: (view: View) => void;
  role: UserRole;
}

// Mapping of views to their parent group ID for auto-expansion
const GROUP_MAPPING: Record<string, string> = {
  schoolInformation: 'academic',
  studentRegistration: 'academic',
  teacherInformation: 'academic',
  classInformation: 'academic',
  subjectManagement: 'academic',
  
  announcements: 'communication',
  notifications: 'communication',
  activityLog: 'communication',
  
  lessonPlanner: 'teaching',
  itemAnalysis: 'teaching',
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
  isCollapsed
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}) => (
  <li>
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
        isActive
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
          : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:text-slate-900 dark:hover:text-white'
      } ${isCollapsed ? 'justify-center' : ''}`}
    >
      <span className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'} ${isCollapsed ? 'mr-0' : 'mr-3'}`}>
        {icon}
      </span>
      {!isCollapsed && <span className="truncate">{label}</span>}
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
  // If collapsed, always show children (acting as a flat list separated by dividers)
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

const SideNav = ({ activeView, setActiveView, role }: SideNavProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
      academic: true, // Default open
      communication: false,
      teaching: false
  });

  // Auto-expand group based on active view (only when expanded)
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

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-slate-50/80 dark:bg-slate-900/80 p-4 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen backdrop-blur-xl sticky top-0 z-30 transition-all duration-500 ease-in-out`}>
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>

      {/* Sophisticated 3D Header */}
      <div className={`relative flex items-center ${isCollapsed ? 'justify-center px-0 flex-col gap-4' : 'justify-between px-2'} py-4 mb-4 transition-all duration-500`}>
          
          {/* 3D Logo Component */}
          <div className="group relative cursor-pointer perspective-1000" onClick={() => isCollapsed && setIsCollapsed(false)}>
              <div className={`relative duration-700 preserve-3d group-hover:rotate-y-180 transition-all ease-out ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}>
                  {/* Front Face */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center backface-hidden z-20 border border-white/10">
                      <BrainCircuitIcon className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  {/* Back Face (The "Core") */}
                  <div className="absolute inset-0 bg-slate-900 rounded-xl shadow-lg flex items-center justify-center backface-hidden rotate-y-180 border border-slate-700">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.9)] animate-pulse"></div>
                  </div>
              </div>
              {/* Glow effect behind logo */}
              <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          </div>

          {/* Text Branding (Hidden when collapsed) */}
          <div className={`flex flex-col overflow-hidden transition-all duration-500 ease-out ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'flex-1 opacity-100 ml-3'}`}>
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

          {/* Toggle Button */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all duration-300 ${isCollapsed ? 'rotate-180 mt-2 bg-slate-100 dark:bg-slate-800' : ''}`}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <SidebarIcon className="w-5 h-5" />
          </button>
      </div>

      {/* Primary Dashboard Link */}
      <div className="mb-6 flex-shrink-0">
        <button
          onClick={() => setActiveView('dashboard')}
          title={isCollapsed ? "Dashboard" : undefined}
          className={`flex items-center w-full px-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 border ${
            activeView === 'dashboard'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg border-transparent'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md border-transparent hover:border-slate-200 dark:hover:border-slate-700'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <HomeIcon className={`w-5 h-5 ${isCollapsed ? 'mr-0' : 'mr-3'} ${activeView === 'dashboard' ? 'text-white dark:text-slate-900' : 'text-slate-500'}`} />
          {!isCollapsed && "Dashboard"}
        </button>
      </div>

      {/* Scrollable Navigation Area */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        
        <NavGroup 
            title="Academic Management" 
            isOpen={openGroups.academic} 
            onToggle={() => toggleGroup('academic')}
            isCollapsed={isCollapsed}
        >
           {role === 'admin' && (
            <NavItem
                icon={<SchoolIcon />}
                label="School Profile"
                isActive={activeView === 'schoolInformation'}
                onClick={() => setActiveView('schoolInformation')}
                isCollapsed={isCollapsed}
            />
           )}
           
           <NavItem
            icon={<UsersIcon />}
            label="Student Information"
            isActive={activeView === 'studentRegistration'}
            onClick={() => setActiveView('studentRegistration')}
            isCollapsed={isCollapsed}
          />

          {role === 'admin' && (
            <NavItem
                icon={<BriefcaseIcon />}
                label="Teacher Information"
                isActive={activeView === 'teacherInformation'}
                onClick={() => setActiveView('teacherInformation')}
                isCollapsed={isCollapsed}
            />
          )}

          <NavItem
            icon={<LibraryIcon />}
            label="Class Information"
            isActive={activeView === 'classInformation'}
            onClick={() => setActiveView('classInformation')}
            isCollapsed={isCollapsed}
          />

          {role === 'admin' && (
            <NavItem
                icon={<BookOpenIcon />}
                label="Subject Management"
                isActive={activeView === 'subjectManagement'}
                onClick={() => setActiveView('subjectManagement')}
                isCollapsed={isCollapsed}
            />
          )}
        </NavGroup>

        <NavGroup 
            title="Communication Hub" 
            isOpen={openGroups.communication} 
            onToggle={() => toggleGroup('communication')}
            isCollapsed={isCollapsed}
        >
          <NavItem
            icon={<MegaphoneIcon />}
            label="Announcements"
            isActive={activeView === 'announcements'}
            onClick={() => setActiveView('announcements')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<BellIcon />}
            label="Notifications"
            isActive={activeView === 'notifications'}
            onClick={() => setActiveView('notifications')}
            isCollapsed={isCollapsed}
          />
           {role === 'admin' && (
             <NavItem
                  icon={<HistoryIcon />}
                  label="System Logs"
                  isActive={activeView === 'activityLog'}
                  onClick={() => setActiveView('activityLog')}
                  isCollapsed={isCollapsed}
              />
           )}
        </NavGroup>

        <NavGroup 
            title="AI Augmented Tools" 
            isOpen={openGroups.teaching} 
            onToggle={() => toggleGroup('teaching')}
            isCollapsed={isCollapsed}
        >
           <NavItem
            icon={<BrainCircuitIcon />}
            label="Learn SA"
            isActive={activeView === 'learnSA'}
            onClick={() => setActiveView('learnSA')}
            isCollapsed={isCollapsed}
          />
           <NavItem
            icon={<PenToolIcon />}
            label="Smart Lesson Planner"
            isActive={activeView === 'lessonPlanner'}
            onClick={() => setActiveView('lessonPlanner')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<PieChartIcon />}
            label="Item Analysis AI"
            isActive={activeView === 'itemAnalysis'}
            onClick={() => setActiveView('itemAnalysis')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<HourglassIcon />}
            label="History SA"
            isActive={activeView === 'historySA'}
            onClick={() => setActiveView('historySA')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<BarChart3Icon />}
            label="Data SA"
            isActive={activeView === 'dataSA'}
            onClick={() => setActiveView('dataSA')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<MicIcon />}
            label="Reading SA"
            isActive={activeView === 'readingSA'}
            onClick={() => setActiveView('readingSA')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<PuzzleIcon />}
            label="Exam SA"
            isActive={activeView === 'quizSA'}
            onClick={() => setActiveView('quizSA')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<CalendarCheckIcon />}
            label="Study Calendar"
            isActive={activeView === 'studyPlanner'}
            onClick={() => setActiveView('studyPlanner')}
            isCollapsed={isCollapsed}
          />
        </NavGroup>

      </nav>
    </aside>
  );
};

export default SideNav;
