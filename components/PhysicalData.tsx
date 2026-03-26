import React, { useState, useEffect } from 'react';
import { BiometricData, BodyMeasurements } from '../types';

interface PhysicalDataProps {
    biometrics: BiometricData;
    metrics: CalculatedMetrics | null;
    lastCalculated: number | null;
    onCalculate: (results: CalculatedMetrics, measurements?: BodyMeasurements) => void;
}

export interface CalculatedMetrics {
    bmi: number;
    bmr: number;
    tdee: number;
    bodyFat: number;
    status: string;
}

const GOAL_TRANSLATIONS: Record<string, string> = {
    'weight_loss': 'Perder Peso',
    'muscle_gain': 'Ganar Músculo',
    'maintenance': 'Mantenimiento',
    'endurance': 'Resistencia'
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
    'sedentary': 1.2,
    'moderate': 1.55,
    'active': 1.725,
    'athlete': 1.9
};

const PhysicalData: React.FC<PhysicalDataProps> = ({ biometrics, metrics, lastCalculated, onCalculate }) => {
    // Advanced measurements state preserved for future use or display
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [measurements, setMeasurements] = useState({
        waist: 0,
        neck: 0,
        hip: 0
    });

    const daysRemaining = lastCalculated
        ? Math.ceil((lastCalculated + (7 * 24 * 60 * 60 * 1000) - Date.now()) / (24 * 60 * 60 * 1000))
        : 0;

    const canCalculate = !lastCalculated || daysRemaining <= 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <header>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Mis Datos Físicos</h1>
                <p className="text-slate-500">Tu biometría base y cálculos de salud.</p>
            </header>

            {/* Initialize Data Card */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <i className="fas fa-database text-emerald-500"></i> Datos Cargados
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Peso</p>
                        <p className="text-xl font-black text-slate-800">{biometrics.weight} kg</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Altura</p>
                        <p className="text-xl font-black text-slate-800">{biometrics.height} cm</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Edad</p>
                        <p className="text-xl font-black text-slate-800">{biometrics.age} años</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Género</p>
                        <p className="text-xl font-black text-slate-800 capitalize">{biometrics.gender === 'male' ? 'Hombre' : biometrics.gender === 'female' ? 'Mujer' : 'Otro'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Objetivo</p>
                        <p className="text-xl font-black text-slate-800 capitalize">{GOAL_TRANSLATIONS[biometrics.goal] || biometrics.goal}</p>
                    </div>
                </div>
            </div>

            {/* Medical & Habits Section */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <i className="fas fa-heartbeat text-emerald-500"></i> Salud y Hábitos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Pathologies */}
                    <div className="md:col-span-2 lg:col-span-2 bg-rose-50 p-4 rounded-xl">
                        <p className="text-xs text-rose-400 font-bold uppercase mb-1">Patologías / Condiciones</p>
                        <p className="font-medium text-slate-700">
                            {biometrics.medicalConditions || (biometrics as any).medical_conditions || 'Ninguna registrada'}
                        </p>
                    </div>

                    {/* Allergies */}
                    <div className="md:col-span-2 lg:col-span-2 bg-indigo-50 p-4 rounded-xl">
                        <p className="text-xs text-indigo-400 font-bold uppercase mb-1">Alergias e Intolerancias</p>
                        <p className="font-medium text-slate-700">
                            {biometrics.allergies && biometrics.allergies.length ? biometrics.allergies : 'Ninguna registrada'}
                        </p>
                    </div>

                    {/* Medications */}
                    <div className="md:col-span-2 lg:col-span-2 bg-blue-50 p-4 rounded-xl">
                        <p className="text-xs text-blue-400 font-bold uppercase mb-1">Medicamentos</p>
                        <p className="font-medium text-slate-700">
                            {biometrics.medications || 'Ninguno'}
                        </p>
                    </div>

                    {/* Injuries */}
                    <div className="md:col-span-2 lg:col-span-2 bg-orange-50 p-4 rounded-xl">
                        <p className="text-xs text-orange-400 font-bold uppercase mb-1">Lesiones</p>
                        <p className="font-medium text-slate-700">
                            {biometrics.injuries || 'Ninguna'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Sueño</p>
                        <p className="text-xl font-black text-slate-800">
                            {biometrics.sleepHours || (biometrics as any).sleep_hours || '-'} h
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Estrés</p>
                        <p className="text-xl font-black text-slate-800 capitalize">
                            {biometrics.stressLevel || (biometrics as any).stress_level === 'very_high' ? 'Muy Alto' : biometrics.stressLevel || (biometrics as any).stress_level === 'high' ? 'Alto' : biometrics.stressLevel || (biometrics as any).stress_level === 'low' ? 'Bajo' : 'Moderado'}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Agua</p>
                        <p className="text-xl font-black text-slate-800">
                            {biometrics.waterIntake || (biometrics as any).water_intake || '-'} L
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Comidas</p>
                        <p className="text-xl font-black text-slate-800">
                            {biometrics.dailyMeals || (biometrics as any).daily_meals || '-'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Results */}
            {metrics ? (
                <div className="animate-slideUp space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* BMI Card */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-lg border-l-8 border-blue-500 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100%] z-0"></div>
                            <div className="relative z-10">
                                <p className="text-slate-400 font-bold text-xs uppercase mb-2">IMC (Índice de Masa)</p>
                                <h2 className="text-4xl font-black text-slate-800">{metrics.bmi}</h2>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-black uppercase text-white ${metrics.status === 'Normal' ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}>
                                    {metrics.status}
                                </span>
                            </div>
                        </div>

                        {/* Body Fat Card */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-lg border-l-8 border-purple-500 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[100%] z-0"></div>
                            <div className="relative z-10">
                                <p className="text-slate-400 font-bold text-xs uppercase mb-2">Grasa Corporal Est.</p>
                                <h2 className="text-4xl font-black text-slate-800">{metrics.bodyFat}%</h2>
                                <p className="text-xs text-slate-400 mt-2">
                                    Estimación automática basada en tus medidas
                                </p>
                            </div>
                        </div>

                        {/* BMR Card */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-lg border-l-8 border-orange-500 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-[100%] z-0"></div>
                            <div className="relative z-10">
                                <p className="text-slate-400 font-bold text-xs uppercase mb-2">Metabolismo Basal</p>
                                <h2 className="text-4xl font-black text-slate-800">{metrics.bmr}</h2>
                                <p className="text-xs text-slate-400 mt-2 font-bold text-orange-400">Kcal / día (Reposo)</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center p-8 bg-slate-100 rounded-3xl">
                    <p className="text-slate-500 font-medium">Completa tu perfil para ver tus métricas automáticas.</p>
                </div>
            )}
        </div>
    );
};

export default PhysicalData;
