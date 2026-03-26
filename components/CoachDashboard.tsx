import React, { useState, useEffect } from 'react';
import { User, UserRole, ProgressLog } from '../types';
import { userService } from '../services/api';
import CoachUpgradeModal from './CoachUpgradeModal'; // Removed

import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface CoachDashboardProps {
    currentUser: User;
    onNavigateToUser: (userId: string) => void;
    onSendMessage: (userId: string, text: string) => void;
}

const CoachDashboard: React.FC<CoachDashboardProps> = ({ currentUser, onNavigateToUser, onSendMessage }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState({
        pendingBalance: "0.00",
        nextPaymentDate: "-",
        commissionRate: "15",
        studentDistribution: { total: 0, active: 0, inactive: 0, free: 0, pro: 0, master: 0 },
        growthData: [] as { name: string, value: number }[]
    });
    const [copied, setCopied] = useState(false);
    // Removed Upgrade Modal state


    // Initial Load of Data
    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser?.id) return;

            try {
                // Parallelize fetching for speed
                const [clientsResult, statsResult] = await Promise.allSettled([
                    userService.getCoachClients(currentUser.id),
                    userService.getCoachStats(currentUser.id)
                ]);

                if (clientsResult.status === 'fulfilled') {
                    if (Array.isArray(clientsResult.value)) setUsers(clientsResult.value);
                } else {
                    console.error("Failed to load clients", clientsResult.reason);
                }

                if (statsResult.status === 'fulfilled') {
                    if (statsResult.value.stats) setStats(statsResult.value.stats);
                } else {
                    console.error("Failed to load stats", statsResult.reason);
                }

            } catch (error) {
                console.error("Failed to load dashboard data (Unexpected)", error);
            }
        };

        fetchData();
    }, [currentUser.id]);

    const handleCopyLink = async () => {
        const link = `${window.location.origin}/?coachId=${currentUser.id}`;

        // Fallback for non-secure contexts or older browsers
        const copyToClipboardFallback = (text: string) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } else {
                    prompt("Copia tu enlace manualmente:", text);
                }
            } catch (err) {
                prompt("Copia tu enlace manualmente:", text);
            }
            document.body.removeChild(textArea);
        };

        if (!navigator.clipboard) {
            copyToClipboardFallback(link);
            return;
        }

        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            copyToClipboardFallback(link);
        }
    };

    const handleConfirmUpgrade = () => {
        // Logic removed
    };

    return (
        <div className="space-y-8 animate-fadeIn pb-10">
            {/* PAYMENT MODAL REMOVED */}
            {/* UPGRADE MODAL REMOVED */}

            {/* HEADER */}
            <div className="flex justify-between items-end">
                {/* ... (Header content same as before) ... */}
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Hola, {currentUser.name} 👋</h1>
                    <p className="text-slate-500 font-medium">Aquí está el rendimiento de tu comunidad hoy.</p>
                </div>
                <div className="flex gap-2">
                    <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${currentUser.coachProfile?.planTier === 'vip' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {currentUser.coachProfile?.planTier === 'vip' ? '👑 Coach VIP' : '🌱 Coach Standard'}
                    </span>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Card ... (Same) ... */}
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
                    {/* ... content ... */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full blur-3xl transform translate-x-10 -translate-y-10 group-hover:scale-110 transition duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-800 rounded-xl">
                                <i className="fas fa-wallet text-emerald-400"></i>
                            </div>
                            <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-400">Mensual</span>
                        </div>
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Saldo Pendiente</h3>
                        <p className="text-4xl font-black text-white mb-2">${stats.pendingBalance}</p>
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                            <i className="fas fa-arrow-up"></i>
                            <span>Estimado mensual</span>
                        </div>
                    </div>
                </div>

                {/* Next Payment Card ... (Same) ... */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
                    {/* ... content ... */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10 group-hover:scale-110 transition duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                                <i className="fas fa-calendar-check text-white"></i>
                            </div>
                        </div>
                        <h3 className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Próximo Pago</h3>
                        <p className="text-4xl font-black text-white mb-2">{stats.nextPaymentDate}</p>
                        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold">
                            <i className="fas fa-info-circle"></i>
                            <span>Fecha de corte</span>
                        </div>
                    </div>
                </div>

                {/* Payment & Subscription Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <i className="fas fa-file-invoice-dollar text-purple-600"></i>
                        </div>
                        {currentUser.status === 'active' && (
                            <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase px-2 py-1 rounded-full">
                                Activo
                            </span>
                        )}
                    </div>

                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Nivel Actual</h3>

                    {/* Simple Level Logic */}
                    {(() => {
                        const totalClients = stats.studentDistribution.total;
                        // const paidClients = stats.studentDistribution.pro + stats.studentDistribution.master;

                        let levelName = "Estándar";
                        let nextLevelGoal = 30; // Goal for Level 2 (30%)
                        let progress = totalClients;
                        let commission = "15%";

                        if (totalClients >= 50) {
                            levelName = "VIP Elite";
                            nextLevelGoal = 0; // Maxed
                            commission = "50%";
                        } else if (totalClients >= 30) {
                            levelName = "VIP";
                            nextLevelGoal = 50; // Goal for Level 3 (50%)
                            commission = "30%";
                        }

                        const remaining = nextLevelGoal > 0 ? nextLevelGoal - totalClients : 0;
                        const progressPercent = nextLevelGoal > 0 ? (totalClients / nextLevelGoal) * 100 : 100;

                        return (
                            <div className="mb-2">
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-black text-slate-900">
                                        {commission}
                                    </p>
                                    <span className="text-sm font-bold text-slate-400">Comisión</span>
                                </div>

                                <p className="text-sm font-bold text-emerald-600 mt-1">
                                    {levelName}
                                </p>

                                {nextLevelGoal > 0 ? (
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Progreso para {nextLevelGoal === 50 ? '50%' : '30%'}</span>
                                            <span className="font-bold">{totalClients} / {nextLevelGoal}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">
                                            Faltan {remaining} alumnos activos para subir de nivel.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-2">
                                        ¡Has alcanzado el nivel máximo de comisión!
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* AFFILIATE LINK SECTION (RESTORED BELOW KPIs) */}
            <div className="bg-slate-900 rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <i className="fas fa-link text-emerald-400"></i> Link de Invitación
                        </h3>
                        <p className="text-slate-400 text-sm">
                            Comparte este enlace con tus alumnos. Se asignarán automáticamente a tu comunidad.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-800/50 p-2 pl-4 rounded-xl border border-slate-700 w-full md:w-auto">
                        <code className="text-emerald-400 font-mono text-sm truncate flex-1 md:flex-none">
                            {window.location.origin}/?coachId={currentUser.id}
                        </code>
                        <button
                            onClick={handleCopyLink}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg text-xs transition flex items-center gap-2"
                        >
                            {copied ? <i className="fas fa-check"></i> : <i className="fas fa-copy"></i>}
                            {copied ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* GRAPHS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Distribution Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-6">Distribución de Alumnos</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Free', value: stats.studentDistribution.free },
                                        { name: 'Pro', value: stats.studentDistribution.pro },
                                        { name: 'Master', value: stats.studentDistribution.master },
                                    ]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell key="cell-0" fill="#94a3b8" />
                                    <Cell key="cell-1" fill="#10b981" />
                                    <Cell key="cell-2" fill="#8b5cf6" />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-slate-400"></div> Free ({stats.studentDistribution.free})
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Pro ({stats.studentDistribution.pro})
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div> Master ({stats.studentDistribution.master})
                        </div>
                    </div>
                </div>

                {/* Growth Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-6">Crecimiento Mensual</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.growthData.length > 0 ? stats.growthData : [{ name: 'Sin datos', value: 0 }]}>
                                <defs>
                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoachDashboard;
