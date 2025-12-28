
import React, { useState, useEffect } from 'react';
import { UserDailyMissions } from '../types';
import { CheckCircleIcon, SquareIcon, GiftIcon, ClockIcon } from './icons';
import { claimDailyBonus } from '../services/databaseService';

interface MissionBoardProps {
    userId: string;
    missionsData: UserDailyMissions | null;
}

export const MissionBoard = ({ userId, missionsData }: MissionBoardProps) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const diff = tomorrow.getTime() - now.getTime();

            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);

            setTimeLeft(`${hours}h ${minutes}m`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!missionsData) return null;

    const allCompleted = (missionsData.missions || []).every(m => m.completed);

    const handleClaim = async () => {
        if (!allCompleted || missionsData.bonusClaimed) return;
        setIsClaiming(true);
        try {
            await claimDailyBonus(userId);
        } catch (error) {
            console.error("Error claiming bonus", error);
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-4 text-white shadow-lg mb-4 relative overflow-hidden border border-indigo-700/50">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-10 -translate-y-10 blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-4 relative z-10">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-100">
                        <GiftIcon className="w-5 h-5 text-yellow-400" />
                        Daily Missions
                    </h3>
                    <p className="text-xs text-indigo-300 mt-0.5">Reset in {timeLeft}</p>
                </div>
                {allCompleted && !missionsData.bonusClaimed && (
                    <button
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-indigo-900 text-xs font-bold rounded-full shadow-lg animate-pulse transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {isClaiming ? 'Claiming...' : 'Claim Bonus'}
                    </button>
                )}
                {allCompleted && missionsData.bonusClaimed && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded-full border border-green-500/50">
                        Bonus Claimed
                    </span>
                )}
            </div>

            <div className="space-y-3 relative z-10">
                {(missionsData.missions || []).map(mission => (
                    <div key={mission.id} className="bg-indigo-800/40 rounded-lg p-3 border border-indigo-700/30 flex items-center gap-3 transition-colors hover:bg-indigo-800/60">
                        <div className="flex-shrink-0">
                            {mission.completed ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                            ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-indigo-400/50" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <p className={`text-sm font-medium truncate ${mission.completed ? 'text-indigo-200 line-through opacity-70' : 'text-white'}`}>
                                    {mission.description}
                                </p>
                                <span className="text-xs font-bold text-indigo-300">
                                    {mission.progress}/{mission.target}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-indigo-950 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${mission.completed ? 'bg-green-500' : 'bg-indigo-400'}`}
                                    style={{ width: `${Math.min((mission.progress / mission.target) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
