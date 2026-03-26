
import React, { useState, useEffect } from 'react';
import { generateMealPlanPDF } from '../utils/PDFGenerator'; // Import PDF generator
import { User, WeeklyPlan, BiometricData, DayPlan } from '../types';
import { generateWeeklyPlan } from '../services/geminiService';
import CookingOverlay from './CookingOverlay';

interface CoachMealPlannerProps {
    currentUser: User;
    onSpendTokens: (amount: number, description: string) => boolean;
    onSavePlan?: (plan: WeeklyPlan) => void;
}

interface ClientInfo {
    name: string;
    age: number;
    gender: 'male' | 'female';
    weight: number;
    height: number;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
    goal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance';
}

interface Macros {
    protein: number;
    carbs: number;
    fats: number;
}

const CoachMealPlanner: React.FC<CoachMealPlannerProps> = ({ currentUser, onSpendTokens, onSavePlan }) => {
    const [viewMode, setViewMode] = useState<'create' | 'history' | 'view'>('create');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [clientInfo, setClientInfo] = useState<ClientInfo>({
        name: '',
        age: 30,
        gender: 'male',
        weight: 70,
        height: 170,
        activityLevel: 'moderate',
        goal: 'maintenance'
    });

    const [macros, setMacros] = useState<Macros>({ protein: 30, carbs: 40, fats: 30 });
    const [favoriteFoods, setFavoriteFoods] = useState('');

    // Plan State
    const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
    const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
    const [history, setHistory] = useState<WeeklyPlan[]>([]);

    // Load History
    useEffect(() => {
        const saved = localStorage.getItem(`coach_plans_${currentUser.id} `);
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load plan history");
            }
        }
    }, [currentUser.id]);

    const saveToHistory = (plan: WeeklyPlan) => {
        const newHistory = [plan, ...history];
        setHistory(newHistory);
        localStorage.setItem(`coach_plans_${currentUser.id} `, JSON.stringify(newHistory));
    };

    // Macro Slider Logic — Smart Autocomplete
    // The third macro always auto-fills to keep the total at exactly 100%.
    // Priority: protein → carbs → fats (fats is the auto-adjusted one when touching P or C,
    //           carbs is auto-adjusted when touching F).
    const handleMacroChange = (type: keyof Macros, value: number) => {
        setMacros(prev => {
            const clamped = Math.max(0, Math.min(100, value));
            if (type === 'protein') {
                const remaining = 100 - clamped;
                // Keep carbs ratio relative to what's left; if prev sum of C+F > 0 keep proportion, else split evenly
                const prevCF = prev.carbs + prev.fats;
                const newCarbs = prevCF > 0
                    ? Math.round((prev.carbs / prevCF) * remaining)
                    : Math.floor(remaining / 2);
                const newFats = remaining - newCarbs;
                return { protein: clamped, carbs: Math.max(0, newCarbs), fats: Math.max(0, newFats) };
            } else if (type === 'carbs') {
                const newFats = Math.max(0, 100 - prev.protein - clamped);
                return { ...prev, carbs: clamped, fats: newFats };
            } else {
                // type === 'fats'
                const newCarbs = Math.max(0, 100 - prev.protein - clamped);
                return { ...prev, carbs: newCarbs, fats: clamped };
            }
        });
    };

    const totalMacros = macros.protein + macros.carbs + macros.fats;
    const isMacrosValid = totalMacros === 100;

    // Basic TDEE Calculation for Preview
    const calculatePreviewTDEE = () => {
        // Mifflin-St Jeor Formula
        let bmr = 10 * clientInfo.weight + 6.25 * clientInfo.height - 5 * clientInfo.age;
        bmr += clientInfo.gender === 'male' ? 5 : -161;

        const activityMultipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'athlete': 1.9
        };

        let tdee = bmr * activityMultipliers[clientInfo.activityLevel];

        // Goal Adjustment
        if (clientInfo.goal === 'weight_loss') tdee -= 500;
        if (clientInfo.goal === 'muscle_gain') tdee += 300;
        if (clientInfo.goal === 'endurance') tdee += 200;

        return Math.round(tdee);
    };

    const handleGenerate = async () => {
        if (!clientInfo.name) {
            setError("Por favor ingresa el nombre del paciente.");
            return;
        }
        if (!isMacrosValid) {
            setError(`La distribución de macros debe sumar 100 % (Actual: ${totalMacros}%)`);
            return;
        }

        if (!onSpendTokens(10, `Plan para ${clientInfo.name} `)) return;

        setIsLoading(true);
        setError(null);

        try {
            // Mock biometrics for the service based on client info
            const mockBiometrics: BiometricData = {
                weight: clientInfo.weight,
                height: clientInfo.height,
                age: clientInfo.age,
                gender: clientInfo.gender,
                goal: clientInfo.goal,
                activityLevel: clientInfo.activityLevel
                // other fields optional
            };

            const metrics = { tdee: calculatePreviewTDEE() };

            const favorites = favoriteFoods.split(',').slice(0, 10).join(', '); // Limit to 10 approx

            const context = {
                clientName: clientInfo.name,
                macros: macros
            };

            const plan: WeeklyPlan = await generateWeeklyPlan(mockBiometrics, metrics, favorites, context);

            // Enrich plan with metadata for history
            plan.metadata = {
                ...plan.metadata,
                clientName: clientInfo.name,
                clientAge: clientInfo.age,
                clientGender: clientInfo.gender,
                clientHeight: clientInfo.height,
                clientActivityLevel: clientInfo.activityLevel,
                macroDistribution: macros,
                targetCalories: metrics.tdee,
                currentWeight: clientInfo.weight,
                goal: clientInfo.goal,
                createdAt: Date.now(),
                favoriteFoods: favorites.split(',').map(s => s.trim())
            };

            setCurrentPlan(plan);
            setSelectedDay(plan.days[0]);
            saveToHistory(plan);
            if (onSavePlan) {
                onSavePlan(plan); // Save to Database (MongoDB)
            }
            setViewMode('view');

        } catch (err: any) {
            setError(err.message || "Error al generar el plan");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

    // --- RENDER HELPERS ---

    if (viewMode === 'history') {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Historial de Pacientes</h1>
                    <button onClick={() => setViewMode('create')} className="text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-xl transition font-bold">
                        <i className="fas fa-plus mr-2"></i> Nuevo Plan
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map((h, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">
                                    {formatDate(h.metadata?.createdAt || 0)}
                                </span>
                                <button onClick={() => {
                                    // Delete logic could go here
                                    const newH = history.filter(item => item !== h);
                                    setHistory(newH);
                                    localStorage.setItem(`coach_plans_${currentUser.id} `, JSON.stringify(newH));
                                }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                            <h3 className="font-bold text-xl text-slate-800 mb-1">{h.metadata?.clientName || 'Sin Nombre'}</h3>
                            <p className="text-sm text-slate-500 capitalize mb-4">{h.metadata?.goal?.replace('_', ' ') || 'General'}</p>

                            <div className="space-y-2 text-sm text-slate-600 mb-6">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-fire text-orange-400 w-5 text-center"></i>
                                    <span>{Math.round(h.metadata?.targetCalories || 0)} kcal</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-weight text-blue-400 w-5 text-center"></i>
                                    <span>{h.metadata?.currentWeight} kg</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setCurrentPlan(h);
                                        setSelectedDay(h.days[0]);
                                        setViewMode('view');
                                    }}
                                    className="w-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold py-2 rounded-xl transition"
                                >
                                    Ver Plan
                                </button>
                                <button
                                    onClick={() => generateMealPlanPDF(h, {
                                        name: h.metadata?.clientName || 'Paciente',
                                        coachName: currentUser.name, // You should probably pass the real coach name here if available
                                        weight: h.metadata?.currentWeight || 0,
                                        goal: h.metadata?.goal || 'maintenance',
                                        targetCalories: h.metadata?.targetCalories || 0
                                    })}
                                    className="bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shadow-sm"
                                >
                                    <i className="fas fa-file-pdf text-red-500"></i> Exportar PDF
                                </button>
                                {/* The instruction had a "Nuevo Plan" button here, but it seems redundant with the one at the top and "Ver Plan" */}
                            </div>
                        </div>
                    ))}
                    {history.length === 0 && <div className="text-slate-400 col-span-full text-center py-10">No tienes planes guardados.</div>}
                </div>
            </div>
        );
    }

    if (viewMode === 'view' && currentPlan && selectedDay) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <button onClick={() => setViewMode('create')} className="text-slate-400 hover:text-slate-600 mb-2 font-bold text-sm">
                            <i className="fas fa-arrow-left mr-1"></i> Volver a Crear
                        </button>
                        <h1 className="text-3xl font-bold text-slate-800">Plan para {currentPlan.metadata?.clientName}</h1>
                        <div className="flex gap-4 text-sm text-slate-500 mt-1">
                            <span><i className="fas fa-bullseye mr-1"></i> {currentPlan.metadata?.goal}</span>
                            <span><i className="fas fa-fire mr-1"></i> {Math.round(currentPlan.metadata?.targetCalories || 0)} kcal</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => generateMealPlanPDF(currentPlan, {
                                name: currentPlan.metadata?.clientName || 'Paciente',
                                coachName: currentUser.name,
                                weight: currentPlan.metadata?.currentWeight || 0,
                                goal: currentPlan.metadata?.goal || 'maintenance',
                                targetCalories: currentPlan.metadata?.targetCalories || 0
                            })}
                            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 flex items-center gap-2"
                        >
                            <i className="fas fa-file-pdf text-red-500"></i> Exportar PDF
                        </button>
                        <button onClick={() => setViewMode('history')} className="bg-white border text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-50">
                            <i className="fas fa-history mr-2"></i> Historial
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Day Sidebar */}
                    <div className="lg:col-span-1 space-y-2">
                        {currentPlan.days.map((d, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedDay(d)}
                                className={`w - full text - left p - 3 rounded - xl font - bold transition flex justify - between items - center
                            ${selectedDay.day === d.day ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}
`}
                            >
                                {d.day}
                            </button>
                        ))}
                    </div>

                    {/* Meal Content */}
                    <div className="lg:col-span-3 space-y-4">
                        {selectedDay.meals.map((meal, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex gap-4 items-start">
                                    <div className={`w - 10 h - 10 rounded - lg flex items - center justify - center text - lg shrink - 0
                                ${meal.type === 'breakfast' ? 'bg-orange-100 text-orange-600' :
                                            meal.type === 'lunch' ? 'bg-blue-100 text-blue-600' :
                                                meal.type === 'dinner' ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'
                                        }
`}>
                                        <i className={`fas ${meal.type === 'breakfast' ? 'fa-coffee' :
                                            meal.type === 'lunch' ? 'fa-utensils' :
                                                meal.type === 'dinner' ? 'fa-moon' : 'fa-apple-alt'
                                            } `}></i>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800 text-lg">{meal.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {meal.ingredients.map((ing, k) => (
                                                <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{ing}</span>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex gap-4 text-xs font-bold text-slate-400">
                                            <span>{meal.calories} kcal</span>
                                            <span>P: {meal.protein}g</span>
                                            <span>C: {meal.carbs}g</span>
                                            <span>F: {meal.fats}g</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Create Mode
    return (
        <div className="max-w-4xl mx-auto p-6">
            <CookingOverlay isVisible={isLoading} />

            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Generador de Planes (Coach)</h1>
                <p className="text-slate-500">Diseña un plan nutricional a medida para tus pacientes.</p>
                <button onClick={() => setViewMode('history')} className="mt-4 text-emerald-600 font-bold hover:underline">
                    <i className="fas fa-history mr-1"></i> Ver Historial de Pacientes
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">

                {/* Patient Info Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <i className="fas fa-user-circle text-emerald-500"></i> Datos del Paciente
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Ej. Juan Pérez"
                                value={clientInfo.name}
                                onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Edad</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={clientInfo.age}
                                    onChange={(e) => setClientInfo({ ...clientInfo, age: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Género</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={clientInfo.gender}
                                    onChange={(e) => setClientInfo({ ...clientInfo, gender: e.target.value as any })}
                                >
                                    <option value="male">Hombre</option>
                                    <option value="female">Mujer</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Peso (kg)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={clientInfo.weight}
                                    onChange={(e) => setClientInfo({ ...clientInfo, weight: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Altura (cm)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={clientInfo.height}
                                    onChange={(e) => setClientInfo({ ...clientInfo, height: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Actividad Física</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                value={clientInfo.activityLevel}
                                onChange={(e) => setClientInfo({ ...clientInfo, activityLevel: e.target.value as any })}
                            >
                                <option value="sedentary">Sedentario (Poco o nada)</option>
                                <option value="light">Ligero (1-3 días/sem)</option>
                                <option value="moderate">Moderado (3-5 días/sem)</option>
                                <option value="active">Activo (6-7 días/sem)</option>
                                <option value="athlete">Atleta (Doble sesión)</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 mb-1">Objetivo del Paciente</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {[
                                    { id: 'weight_loss', label: 'Perder Peso', icon: 'fa-arrow-down' },
                                    { id: 'maintenance', label: 'Mantener', icon: 'fa-balance-scale' },
                                    { id: 'muscle_gain', label: 'Ganar Músculo', icon: 'fa-dumbbell' },
                                    { id: 'endurance', label: 'Rendimiento', icon: 'fa-running' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setClientInfo({ ...clientInfo, goal: opt.id as any })}
                                        className={`p - 3 rounded - xl border flex flex - col items - center gap - 2 transition text - sm font - bold
                                ${clientInfo.goal === opt.id
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }
`}
                                    >
                                        <i className={`fas ${opt.icon} `}></i> {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100 my-8" />

                {/* Macros Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <i className="fas fa-chart-pie text-blue-500"></i> Distribución de Macros
                    </h3>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between mb-4 text-sm font-bold text-slate-600">
                            <span>Ajusta dos barras — la tercera se completa automáticamente</span>
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-0.5 rounded-full text-xs">
                                ✓ Total: {totalMacros}%
                            </span>
                        </div>

                        {/* Visual proportion bar */}
                        <div className="flex h-3 rounded-full overflow-hidden mb-5 shadow-inner">
                            <div
                                style={{ width: `${macros.protein}%`, transition: 'width 0.2s ease' }}
                                className="bg-blue-500"
                                title={`Proteínas ${macros.protein}%`}
                            />
                            <div
                                style={{ width: `${macros.carbs}%`, transition: 'width 0.2s ease' }}
                                className="bg-orange-400"
                                title={`Carbohidratos ${macros.carbs}%`}
                            />
                            <div
                                style={{ width: `${macros.fats}%`, transition: 'width 0.2s ease' }}
                                className="bg-yellow-400"
                                title={`Grasas ${macros.fats}%`}
                            />
                        </div>

                        <div className="space-y-5">
                            {/* Proteínas */}
                            <div>
                                <div className="flex justify-between text-xs font-bold text-blue-600 mb-1">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                                        Proteínas
                                    </span>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{macros.protein}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    className="w-full accent-blue-500 cursor-pointer"
                                    value={macros.protein}
                                    onChange={(e) => handleMacroChange('protein', parseInt(e.target.value))}
                                />
                            </div>

                            {/* Carbohidratos */}
                            <div>
                                <div className="flex justify-between text-xs font-bold text-orange-600 mb-1">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block"></span>
                                        Carbohidratos
                                    </span>
                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{macros.carbs}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    className="w-full accent-orange-500 cursor-pointer"
                                    value={macros.carbs}
                                    onChange={(e) => handleMacroChange('carbs', parseInt(e.target.value))}
                                />
                            </div>

                            {/* Grasas — auto-adjusted por proteínas y carbs */}
                            <div className="opacity-75">
                                <div className="flex justify-between text-xs font-bold text-yellow-600 mb-1">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
                                        Grasas
                                        <span className="text-slate-400 font-normal ml-1">(ajuste automático)</span>
                                    </span>
                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{macros.fats}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    className="w-full accent-yellow-500 cursor-pointer"
                                    value={macros.fats}
                                    onChange={(e) => handleMacroChange('fats', parseInt(e.target.value))}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Puedes también mover esta barra — se ajustará Carbohidratos.
                                </p>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex gap-4 mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> P: {macros.protein}% · {Math.round(macros.protein / 100 * (calculatePreviewTDEE() / 4))}g</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> C: {macros.carbs}% · {Math.round(macros.carbs / 100 * (calculatePreviewTDEE() / 4))}g</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> F: {macros.fats}% · {Math.round(macros.fats / 100 * (calculatePreviewTDEE() / 9))}g</span>
                        </div>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <i className="fas fa-utensils text-orange-500"></i> Preferencias Alimenticias
                    </h3>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Lista de comidas (Max 10)</label>
                    <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Ej. Salmón, Arroz integral, Aguacate (Separados por coma)"
                        value={favoriteFoods}
                        onChange={(e) => setFavoriteFoods(e.target.value)}
                    />
                </div>

                {/* Preview Calculation */}
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-8 flex items-center justify-between">
                    <div className="text-emerald-800">
                        <p className="text-xs font-bold uppercase opacity-60">Estimación Calórica (TDEE)</p>
                        <p className="text-2xl font-bold">{calculatePreviewTDEE()} kcal</p>
                    </div>
                    <div className="text-right text-emerald-600 text-xs font-bold">
                        *Calculado para el objetivo: <br /> {clientInfo.goal.replace('_', ' ')}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100 flex items-center gap-2">
                        <i className="fas fa-exclamation-circle"></i> {error}
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition transform hover:scale-[1.01] disabled:opacity-50 disabled:scale-100"
                >
                    {isLoading ? 'Generando Plan con IA...' : `Generar Plan Profesional (10 Tk) · P${macros.protein}/C${macros.carbs}/F${macros.fats}`}
                </button>

            </div>
        </div>
    );
};

export default CoachMealPlanner;
