import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

interface WorkoutTrackerProps {
    userId: string;
    userName: string;
    onShare?: (msg: string, type: 'achievement' | 'motivation' | 'question') => void;
}

const WorkoutTracker: React.FC<WorkoutTrackerProps> = ({ userId, userName, onShare }) => {
    const [weeklyLog, setWeeklyLog] = useState<boolean[]>(Array(7).fill(false));
    const [todayCompleted, setTodayCompleted] = useState(false);

    // Get current day index (0=Sunday, 1=Monday... but we want Mon=0, Sun=6)
    // Or simpler: Just use 0-6 relative to "start of week" logic.
    // Standard JS Date: 0=Sun, 1=Mon.
    // Let's use simplified mapping: Mon(0) - Sun(6).
    const getDayIndex = () => {
        const day = new Date().getDay(); // 0-6 (Sun-Sat)
        return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
    };

    const currentDayIdx = getDayIndex();

    useEffect(() => {
        // Load weekly log from storage
        // Key format: nutrifit_workout_log_USERID_WEEKSTART
        // For simplicity MVP: just one key 'nutrifit_workout_log_USERID' and we reset on Mondays?
        // Or just store an object { date: boolean } and map it dynamically?
        // Let's store simple map for current week to keep it easy.
        const saved = localStorage.getItem(`nutrifit_workout_log_${userId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Reset if new week? (Simulated by checking if today's entry is far from last update? Too complex).
                // Let's just trust the saved array for now, assuming user resets manually or we reset on Monday.
                // Better: Store timestamp of last reset.

                // Check reset condition (Monday)
                const lastReset = localStorage.getItem(`nutrifit_workout_reset_${userId}`);
                const now = new Date();
                const monday = new Date(now);
                monday.setDate(now.getDate() - currentDayIdx);
                monday.setHours(0, 0, 0, 0);

                if (!lastReset || new Date(parseInt(lastReset)).getTime() < monday.getTime()) {
                    // It's a new week! Reset.
                    setWeeklyLog(Array(7).fill(false));
                    localStorage.setItem(`nutrifit_workout_reset_${userId}`, Date.now().toString());
                    setTodayCompleted(false);
                } else {
                    setWeeklyLog(parsed);
                    setTodayCompleted(parsed[currentDayIdx]);
                }
            } catch (e) {
                console.error("Error loading workout log", e);
            }
        } else {
            // First time
            localStorage.setItem(`nutrifit_workout_reset_${userId}`, Date.now().toString());
        }
    }, [userId]);

    const handleToggle = () => {
        const newState = !todayCompleted;
        setTodayCompleted(newState);

        const newLog = [...weeklyLog];
        newLog[currentDayIdx] = newState;
        setWeeklyLog(newLog);

        localStorage.setItem(`nutrifit_workout_log_${userId}`, JSON.stringify(newLog));

        if (newState) {
            // Trigger Confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#34d399', '#fccd25'] // Emerald and Gold
            });

            // Automatic Community Post (Requested Feature)
            if (onShare) {
                // Determine first name safely
                const firstName = userName.split(' ')[0] || 'Un guerrero';

                const MESSAGES = [
                    `${firstName} ya cumplió con su entreno de hoy. ¿Y tú? ¡Vamos, actívate! 😊`,
                    `¡${firstName} está on fire! 🔥 Entreno completado. No te quedes atrás.`,
                    `Hoy ${firstName} decidió ser más fuerte que sus excusas. 💪 ¿Quién más se suma?`,
                    `Un paso más cerca de la meta para ${firstName}. 🚀 ¡Sigue su ejemplo!`,
                    `¡Sin excusas! ${firstName} ya sudó la camiseta hoy. 💦 Tu turno.`,
                    `La disciplina de ${firstName} es inspiradora. ✨ ¡Entreno listo!`,
                    `¡Pum! 💥 ${firstName} acaba de terminar su rutina. Dale duro tú también.`,
                    `Constancia pura: ${firstName} marcó su check de hoy. ✅ ¿Tú ya cumpliste?`
                ];

                const randomMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
                onShare(randomMsg, 'workout');
            }
        }
    };

    const completedCount = weeklyLog.filter(Boolean).length;
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    const handleShare = () => {
        if (onShare) {
            onShare(`🔥 ¡He completado ${completedCount}/7 días de entrenamiento esta semana! #NutriFitWarrior`, 'workout');
        } else {
            alert("¡Logro Compartido en la Comunidad!");
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full relative overflow-hidden group">
            {/* Decorative BG */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded inline-block mb-2">
                        SEMANA ACTUAL
                    </span>
                    <h3 className="font-bold text-slate-800 text-lg">Registro de Actividad</h3>
                    <p className="text-slate-500 text-xs mt-1">
                        Consistencia es clave. ¡Vamos por esos 4 días!
                    </p>
                </div>
                <div className="text-center">
                    <span className="block text-3xl font-bold text-slate-800">{completedCount}<span className="text-sm text-slate-400">/7</span></span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Días</span>
                </div>
            </div>

            {/* Main Action */}
            <div className="flex-1 flex flex-col items-center justify-center py-4 relative z-10">
                <p className="text-slate-600 font-medium mb-4 text-center">
                    ¿{userName.split(' ')[0]}, hiciste ejercicio hoy?
                </p>

                <button
                    onClick={handleToggle}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 transform ${todayCompleted
                        ? 'bg-emerald-500 shadow-lg shadow-emerald-200 scale-110'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-300 hover:text-slate-400 scale-100'
                        }`}
                >
                    {todayCompleted ? (
                        <i className="fas fa-check text-3xl text-white animate-bounce-short"></i>
                    ) : (
                        <i className="fas fa-dumbbell text-2xl"></i>
                    )}

                    {/* Ripple Effect if Active */}
                    {todayCompleted && (
                        <span className="absolute inset-0 rounded-full border-2 border-emerald-500 opacity-0 animate-ping"></span>
                    )}
                </button>

                <p className={`mt-3 text-sm font-bold transition-all ${todayCompleted ? 'text-emerald-600 opacity-100' : 'opacity-0 h-0'}`}>
                    ¡Excelente trabajo! 💪
                </p>
            </div>

            {/* Weekly Visuals */}
            <div className="mt-6">
                <div className="flex justify-between items-center px-2">
                    {weeklyLog.map((completed, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${completed
                                ? 'bg-emerald-500 scale-110 shadow-sm shadow-emerald-200'
                                : idx === currentDayIdx
                                    ? 'border-2 border-slate-300 bg-transparent animate-pulse' // Highlight today empty
                                    : 'bg-slate-100'
                                }`}></div>
                            <span className={`text-[10px] font-bold ${idx === currentDayIdx ? 'text-slate-800' : 'text-slate-300'}`}>
                                {days[idx]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Share Button (Conditional) */}
            {completedCount >= 4 && (
                <div className="mt-6 pt-4 border-t border-slate-50 animate-fade-in-up">
                    <button
                        onClick={handleShare}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-share-alt"></i> Compartir Logro
                    </button>
                </div>
            )}

        </div>
    );
};

export default WorkoutTracker;
