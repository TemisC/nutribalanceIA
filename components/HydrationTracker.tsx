import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

interface HydrationTrackerProps {
    weight: number;
    userName: string;
    onShare?: (msg: string, type: 'achievement' | 'hydration') => void;
    variant?: 'dashboard' | 'sidebar'; // Different styles for Dashboard main view vs Community sidebar
}

const HydrationTracker: React.FC<HydrationTrackerProps> = ({ weight, userName, onShare, variant = 'dashboard' }) => {
    const [goalGlasses, setGoalGlasses] = useState(10); // Default
    const [glassesDrank, setGlassesDrank] = useState(0);
    const [accepted, setAccepted] = useState(false);
    const [litersDrank, setLitersDrank] = useState(0);

    // Calculate Goal on mount/weight change
    useEffect(() => {
        // Formula: Weight / 7 = Glasses of 250ml
        // Example: 70kg / 7 = 10 glasses (2.5L).
        const calculated = Math.ceil(weight / 7);
        setGoalGlasses(calculated > 0 ? calculated : 10); // Min 10 just in case
    }, [weight]);

    useEffect(() => {
        // Load state
        const today = new Date().toISOString().split('T')[0];
        const saved = localStorage.getItem('nutrifit_hydration');

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.date === today && parsed.userName === userName) {
                    setGlassesDrank(parsed.glasses);
                    setAccepted(parsed.accepted);
                } else {
                    // New day or new user -> Reset
                    setGlassesDrank(0);
                    setAccepted(false);
                }
            } catch (e) {
                console.error("Hydration load error", e);
            }
        }
    }, [userName]);

    useEffect(() => {
        setLitersDrank((glassesDrank * 250) / 1000);
    }, [glassesDrank]);

    const saveState = (newGlasses: number, isAccepted: boolean) => {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('nutrifit_hydration', JSON.stringify({
            date: today,
            userName,
            glasses: newGlasses,
            accepted: isAccepted
        }));
    };

    const handleAccept = () => {
        setAccepted(true);
        saveState(glassesDrank, true);
        if (onShare) {
            onShare(`¡He aceptado el Reto de Hidratación de hoy! 💧 Mi meta: ${(goalGlasses * 250) / 1000}L (${goalGlasses} vasos).`, 'hydration'); // Changed from 'achievement' to 'hydration'
        } else {
            alert("¡Reto Aceptado! Publicado en la comunidad.");
        }

        // Mini celebration
        confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#3b82f6', '#60a5fa', '#93c5fd'] // Blues
        });
    };

    const handleDrink = () => {
        if (glassesDrank >= goalGlasses) return; // Cap at goal? Or allow overtime? Let's cap visual but allow logic.
        // Actually limit to goal for simple UI

        const newVal = glassesDrank + 1;
        setGlassesDrank(newVal);
        saveState(newVal, accepted);

        // Share on Completion
        if (newVal === goalGlasses && onShare) {
            onShare(`¡He completado mi meta de hidratación de hoy! 💧 (${(goalGlasses * 250) / 1000}L)`, 'hydration');
        }

        // Confetti
        confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#dbeafe']
        });

        // Applause sound could go here if we had assets
    };

    // Render Logic
    const progressPercent = Math.min(100, (glassesDrank / goalGlasses) * 100);

    if (!accepted) {
        // PRE-ACCEPTANCE VIEW
        return (
            <div className={`relative overflow-hidden rounded-[2rem] shadow-lg text-white p-6 ${variant === 'sidebar' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                <div className="relative z-10">
                    <span className="bg-white/20 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-3 inline-block">
                        Reto Diario
                    </span>
                    <h3 className="text-2xl font-black mb-2 leading-tight">Hidratación Inteligente 💧</h3>
                    <p className="text-blue-50 text-sm mb-6 font-medium">
                        Tu meta hoy: <span className="font-bold text-white text-lg">{(goalGlasses * 250) / 1000}L</span> ({goalGlasses} vasos).
                        <br />Calculado para tu peso actual.
                    </p>
                    <button
                        onClick={handleAccept}
                        className="w-full bg-white text-blue-600 font-bold py-3 rounded-xl hover:bg-blue-50 transition shadow-lg transform hover:scale-105 active:scale-95"
                    >
                        Aceptar Reto
                    </button>
                </div>
            </div>
        );
    }

    // ACTIVE TRACKER VIEW
    return (
        <div className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden ${variant === 'sidebar' ? '' : 'h-full flex flex-col'}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <i className="fas fa-tint text-blue-500"></i> Hidratación
                    </h3>
                    <p className="text-slate-400 text-xs">Meta: {goalGlasses} vasos (250ml)</p>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-black text-blue-600">{litersDrank.toFixed(2)}<span className="text-sm text-slate-400 font-medium">L</span></span>
                </div>
            </div>

            {/* Grid of Glasses */}
            <div className="flex-1 flex flex-wrap gap-3 justify-center content-start">
                {Array.from({ length: goalGlasses }).map((_, idx) => {
                    const isFilled = idx < glassesDrank;
                    return (
                        <button
                            key={idx}
                            onClick={() => !isFilled && idx === glassesDrank && handleDrink()} // Only click next empty one
                            disabled={isFilled || idx !== glassesDrank}
                            className={`
                            w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 relative
                            ${isFilled ? 'bg-blue-100 text-blue-500 scale-100' : 'bg-slate-50 text-slate-300 hover:bg-blue-50 cursor-pointer'}
                            ${idx === glassesDrank ? 'ring-2 ring-blue-400 ring-offset-2 animate-pulse scale-110' : ''}
                        `}
                        >
                            <i className="fas fa-glass-whiskey text-lg"></i>
                            {isFilled && (
                                <span className="absolute inset-0 flex items-center justify-center animate-ping opacity-0">
                                    <div className="w-full h-full bg-blue-400 rounded-xl"></div>
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                    <span>Progreso</span>
                    <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-700 ease-out relative"
                        style={{ width: `${progressPercent}%` }}
                    >
                        <div className="absolute top-0 left-0 w-full h-full bg-white/30 animate-shimmer"></div>
                    </div>
                </div>
            </div>

            {glassesDrank >= goalGlasses && (
                <div className="mt-4 text-center animate-bounce">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                        🎉 ¡Meta cumplida!
                    </span>
                </div>
            )}

        </div>
    );
};

export default HydrationTracker;
