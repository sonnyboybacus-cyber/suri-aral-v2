
import React from 'react';
import { GamificationProfile } from '../types';
import { TrendingUpIcon } from './icons';

interface GamificationBarProps {
    profile: GamificationProfile;
    userName: string;
}

export const GamificationBar = ({ profile, userName }: GamificationBarProps) => {
    const nextLevelXP = profile.current_level * 500;
    const progressPercent = ((profile.current_xp % 500) / 500) * 100;
    
    const getLevelTitle = (level: number) => {
        if (level < 5) return "Novice Scholar";
        if (level < 10) return "Apprentice Researcher";
        if (level < 20) return "Expert Analyst";
        return "Master Educator";
    };

    return (
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in-up sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {userName}
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-[10px] uppercase tracking-wider rounded-full font-bold">
                            {getLevelTitle(profile.current_level)}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Level {profile.current_level} • {profile.current_xp} Total XP
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6 flex-1 max-w-md w-full">
                <div className="flex-1">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                        <span>Progress to Level {profile.current_level + 1}</span>
                        <span>{profile.current_xp % 500} / 500 XP</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-500 ease-out" 
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>
                
                <div className="flex flex-col items-center justify-center min-w-[60px]">
                    <div className="relative">
                        <TrendingUpIcon className="w-6 h-6 text-orange-500 drop-shadow-sm" />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">{profile.current_streak} Day Streak</span>
                </div>
            </div>
        </div>
    );
};
