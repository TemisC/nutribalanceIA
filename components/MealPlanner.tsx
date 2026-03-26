import React, { useState, useEffect } from 'react';
import { WeeklyPlan, DayPlan, Meal } from '../types';
import { generateWeeklyPlan } from '../services/geminiService';
import { generateMealPlanPDF } from '../utils/PDFGenerator'; // Import PDF generator
import CookingOverlay from './CookingOverlay';

interface MealPlannerProps {
    onAddToCart: (ingredients: string[]) => void;
    metrics: any | null;
    biometrics: any;
    onNavigate: (tab: string, state?: any) => void;
    currentPlan: WeeklyPlan | null;
    planHistory: WeeklyPlan[];
    onSavePlan: (plan: WeeklyPlan) => void;
    onSpendTokens: (amount: number, description: string) => boolean;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ onAddToCart, metrics, biometrics, onNavigate, currentPlan, planHistory, onSavePlan, onSpendTokens }) => {
    // Only local state for temporary inputs or view selection, core plan state is now in props
    const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
    const [favoriteFoods, setFavoriteFoods] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'current' | 'history' | 'create'>('current');

    // Sync selected Day when plan changes
    useEffect(() => {
        if (currentPlan && currentPlan.days.length > 0) {
            setSelectedDay(currentPlan.days[0]);
        }
    }, [currentPlan]);


    const hasValidMetrics = metrics && metrics.tdee > 0;

    const calculateTargetCalories = () => {
        if (!metrics || !biometrics) return 2000;

        const tdee = metrics.tdee;
        const goal = biometrics.goal;

        switch (goal) {
            case 'weight_loss':
                return Math.max(1200, tdee - 500); // Deficit of 500, min 1200 safety
            case 'muscle_gain':
                return tdee + 300; // Surplus for growth
            case 'endurance':
                return tdee + 200; // Slight surplus for performance
            case 'maintenance':
            default:
                return tdee;
        }
    };

    const handleRegenerate = async () => {
        // Token Check
        const hasBalance = onSpendTokens(50, 'Generar Plan Semanal (IA)');
        if (!hasBalance) return;

        setIsGenerating(true);
        try {
            const targetCalories = calculateTargetCalories();
            console.log("Generating plan with:", { biometrics, metrics, favoriteFoods, adjustedTarget: targetCalories });

            // Pass adjusted target explicitly
            const generatedPlan = await generateWeeklyPlan(biometrics, { ...metrics, tdee: targetCalories }, favoriteFoods);

            if (generatedPlan && generatedPlan.days) {
                // Add metadata to the plan
                generatedPlan.metadata = {
                    targetCalories: metrics?.tdee || 0,
                    currentWeight: biometrics?.weight || 0,
                    goal: biometrics?.goal || '',
                    favoriteFoods: favoriteFoods.split(',').map(f => f.trim()).filter(f => f),
                    createdAt: Date.now()
                };

                onSavePlan(generatedPlan); // Save to App state and localStorage
                const firstDay = generatedPlan.days[0];
                setSelectedDay(firstDay);
                setViewMode('current'); // Switch back to view mode
            } else {
                throw new Error("Formato de plan inválido recibido de la IA");
            }

        } catch (error: any) {
            console.error("Error generating plan:", error);
            // Show specific error from backend (e.g. "No tienes suficientes tokens" or "Error 500")
            alert(`Error: ${error.message || "Hubo un error desconocido"}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    // Render History View
    if (viewMode === 'history') {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Historial de Planes</h1>
                    <button onClick={() => setViewMode('current')} className="text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-xl transition font-bold">
                        <i className="fas fa-arrow-left mr-2"></i> Volver al Plan Actual
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {planHistory.map((hPlan) => (
                        <div key={hPlan.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">
                                    {formatDate(hPlan.metadata?.createdAt || 0)}
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2">Objetivo: {hPlan.metadata?.goal?.replace('_', ' ') || 'General'}</h3>
                            <div className="text-sm text-slate-500 space-y-1 mb-4">
                                <p><i className="fas fa-fire text-orange-400 w-5"></i> {Math.round(hPlan.metadata?.targetCalories || 0)} kcal</p>
                                <p><i className="fas fa-weight text-blue-400 w-5"></i> {hPlan.metadata?.currentWeight} kg</p>
                            </div>
                            <button
                                onClick={() => {
                                    onSavePlan(hPlan); // Set as current
                                    setViewMode('current');
                                }}
                                className="w-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold py-2 rounded-xl transition"
                            >
                                Ver este plan
                            </button>
                        </div>
                    ))}
                    {planHistory.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-400">
                            No hay planes guardados en el historial.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!currentPlan || !selectedDay || viewMode === 'create') {
        return (
            <div className="p-6 max-w-7xl mx-auto py-12">
                <CookingOverlay isVisible={isGenerating} />
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10 relative">
                        <div className="absolute top-0 right-0 hidden md:block">
                            <button
                                onClick={() => setViewMode('history')}
                                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shadow-sm"
                            >
                                <i className="fas fa-history"></i> Historial
                            </button>
                        </div>
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fas fa-utensils text-3xl text-emerald-600"></i>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-4">Configura tu Plan Semanal</h2>
                        <p className="text-slate-500 text-lg">Nuestra IA diseñará un menú único basado en tus datos físicos y gustos.</p>
                        <div className="md:hidden mt-4 flex justify-center">
                            <button
                                onClick={() => setViewMode('history')}
                                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shadow-sm"
                            >
                                <i className="fas fa-history"></i> Ver Historial
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
                        {!hasValidMetrics && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-8">
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => setViewMode('history')}
                                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shadow-sm"
                                    >
                                        <i className="fas fa-history"></i> Historial
                                    </button>
                                </div>
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                    <i className="fas fa-exclamation-triangle text-amber-500 text-2xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">Datos Faltantes</h3>
                                <p className="text-slate-600 mb-6 max-w-md">Para generar un plan nutricional seguro y efectivo, necesitamos calcular primero tu Gasto Calórico Total (TDEE).</p>
                                <button
                                    onClick={() => onNavigate('physical-data')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition"
                                >
                                    Ir a Mis Datos Físicos
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-slate-50 p-4 rounded-xl text-center">
                                <p className="text-xs text-slate-400 font-bold uppercase">Objetivo</p>
                                <p className="font-bold text-slate-800 text-lg capitalize">{biometrics?.goal?.replace('_', ' ') || 'Salud'}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-center">
                                <p className="text-xs text-slate-400 font-bold uppercase">Calorías Diarias</p>
                                <p className="font-bold text-slate-800 text-lg">{metrics?.tdee ? Math.round(metrics.tdee) : '--'} kcal</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-center">
                                <p className="text-xs text-slate-400 font-bold uppercase">Peso Actual</p>
                                <p className="font-bold text-slate-800 text-lg">{biometrics?.weight || '--'} kg</p>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-slate-700 font-bold mb-2">
                                <i className="fas fa-heart text-red-500 mr-2"></i>Comidas o Ingredientes Favoritos (Opcional)
                            </label>
                            <input
                                type="text"
                                disabled={!hasValidMetrics}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-50"
                                placeholder="Ej: Avena, Chocolate Amargo, Salmón, Tacos..."
                                value={favoriteFoods}
                                onChange={(e) => setFavoriteFoods(e.target.value)}
                            />
                            <p className="text-xs text-slate-400 mt-2">Nuestra IA intentará incluir estos antojos de forma equilibrada.</p>
                        </div>

                        {hasValidMetrics && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                                <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                                <div>
                                    <p className="text-blue-800 text-sm font-bold">¿Quieres un plan más exacto?</p>
                                    <p className="text-blue-600 text-xs">
                                        Si has cambiado de peso o medidas recientemente, <button onClick={() => onNavigate('physical-data')} className="underline font-bold hover:text-blue-800">actualiza tus datos físicos</button> antes de generar el plan.
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleRegenerate}
                            disabled={isGenerating || !hasValidMetrics}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition transform hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <><i className="fas fa-spinner fa-spin"></i> Diseñando tu menú...</>
                            ) : (
                                <><i className="fas fa-magic"></i> Generar Plan Personalizado</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="p-6 max-w-7xl mx-auto">
            <CookingOverlay isVisible={isGenerating} />
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Plan de Comidas Semanal</h1>
                    <p className="text-slate-500">
                        {currentPlan.metadata ? (
                            <span>Generado el {formatDate(currentPlan.metadata.createdAt)} • {Math.round(currentPlan.metadata.targetCalories)} kcal</span>
                        ) : 'Tu plan personalizado'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => generateMealPlanPDF(currentPlan, {
                            name: "Mi Plan Personal",
                            weight: currentPlan.metadata?.currentWeight,
                            goal: currentPlan.metadata?.goal,
                            targetCalories: currentPlan.metadata?.targetCalories
                        })}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 md:hidden lg:flex"
                    >
                        <i className="fas fa-file-pdf text-red-500"></i> Exportar PDF
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2"
                    >
                        <i className="fas fa-history"></i> Historial
                    </button>
                    <button
                        onClick={() => setViewMode('create')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold transition flex items-center gap-2"
                    >
                        <i className="fas fa-plus"></i> Nuevo Plan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Day Selector Sidebar */}
                <div className="lg:col-span-1 space-y-3">
                    {currentPlan.days.map((day, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedDay(day)}
                            className={`w - full text - left p - 4 rounded - xl font - bold transition flex justify - between items - center ${selectedDay.day === day.day
                                ? 'bg-slate-800 text-white shadow-lg'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                                } `}
                        >
                            {day.day}
                            <i className="fas fa-chevron-right opacity-50"></i>
                        </button>
                    ))}
                    <div className="mt-8 bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                        <h3 className="text-emerald-800 font-bold mb-2">Resumen Diario</h3>
                        <div className="space-y-2 text-sm text-emerald-700">
                            <div className="flex justify-between"><span>Calorías:</span> <span>{Math.round(currentPlan.metadata?.targetCalories || 0)} kcal</span></div>
                            <div className="flex justify-between"><span>Peso Ref:</span> <span>{currentPlan.metadata?.currentWeight || '--'} kg</span></div>
                        </div>
                    </div>
                </div>

                {/* Meals View */}
                <div className="lg:col-span-3 space-y-6">
                    {selectedDay.meals.map((meal) => (
                        <div key={meal.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className={`w - 12 h - 12 rounded - xl flex items - center justify - center text - xl
                    ${meal.type === 'breakfast' ? 'bg-orange-100 text-orange-600' :
                                            meal.type === 'lunch' ? 'bg-blue-100 text-blue-600' :
                                                meal.type === 'dinner' ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'
                                        } `}>
                                        <i className={`fas ${meal.type === 'breakfast' ? 'fa-coffee' :
                                            meal.type === 'lunch' ? 'fa-utensils' :
                                                meal.type === 'dinner' ? 'fa-moon' : 'fa-apple-alt'
                                            } `}></i>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{
                                            meal.type === 'breakfast' ? 'Desayuno' :
                                                meal.type === 'lunch' ? 'Almuerzo' :
                                                    meal.type === 'dinner' ? 'Cena' : 'Snack'
                                        }</span>
                                        <h3 className="text-xl font-bold text-slate-800">{meal.name}</h3>
                                        <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                            <span><i className="fas fa-fire text-orange-400 mr-1"></i> {meal.calories} kcal</span>
                                            <span><i className="fas fa-dumbbell text-slate-400 mr-1"></i> {meal.protein}g P</span>
                                            <span><i className="fas fa-bread-slice text-slate-400 mr-1"></i> {meal.carbs}g C</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onAddToCart(meal.ingredients)}
                                    className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition text-sm font-bold"
                                >
                                    <i className="fas fa-plus mr-1"></i> A la lista
                                </button>
                            </div>

                            <div className="mt-2 flex justify-end">
                                <button
                                    onClick={() => {
                                        const prompt = `Hola Nutribot, quiero sustituir este plato de mi plan:\n"${meal.name}" (${meal.calories} kcal, P: ${meal.protein}g, C: ${meal.carbs}g).\n\nIngredientes actuales: ${meal.ingredients.join(', ')}.\n\nPor favor genera una opción alternativa con macros similares, pero usando estos ingredientes que tengo/prefiero:\n[ESCRIBE AQUÍ TUS INGREDIENTES]`;
                                        onNavigate('chat-nutrition', { initialInput: prompt });
                                    }}
                                    className="text-xs font-bold text-slate-400 hover:text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                                >
                                    <i className="fas fa-robot"></i> Cambiar con Nutribot
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50">
                                <p className="text-xs text-slate-400 font-bold uppercase mb-2">Ingredientes:</p>
                                <div className="flex flex-wrap gap-2">
                                    {meal.ingredients.map((ing, i) => (
                                        <span key={i} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs">
                                            {ing}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default MealPlanner;
