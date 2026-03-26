import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { ProgressLog } from '../types';
import { CalculatedMetrics } from './PhysicalData';
import WorkoutTracker from './WorkoutTracker';
import HydrationTracker from './HydrationTracker';

interface DashboardProps {
  logs: ProgressLog[];
  userName: string;
  metrics: CalculatedMetrics | null;
  metrics: CalculatedMetrics | null;
  userWeight: number;
  userId: string;
  onShare: (msg: string, type: 'achievement') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ logs, userName, metrics, userWeight, userId, onShare }) => {
  // Sort logs chronologically (Oldest -> Newest) for correct processing and chart display
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Use logs for weight history if available, otherwise use the profile weight
  const currentWeightVal = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].weight : userWeight;

  // Calculate change - if no logs or only 1 log, change is 0
  const initialWeight = sortedLogs.length > 0 ? sortedLogs[0].weight : userWeight;
  const weightChange = (currentWeightVal - initialWeight).toFixed(1);

  // Metrics Display
  const displayBodyFat = metrics ? `${metrics.bodyFat}%` : '--%';
  const displayBMR = metrics ? metrics.bmr.toLocaleString() : '--';

  // Stats Grid Value for Weight Change
  const weightChangeText = sortedLogs.length <= 1 ? 'Sin cambios' : `${weightChange.startsWith('-') ? weightChange : '+' + weightChange}kg total`;

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">¡Hola {userName}! 👋</h1>
        <p className="text-slate-500 mt-1">Aquí tienes un resumen de tu progreso nutricional y físico.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Peso Actual', value: `${currentWeightVal || '--'} kg`, trend: weightChangeText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Grasa Corporal', value: displayBodyFat, trend: metrics ? 'Calculado' : 'Pendiente', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Kcal Basales', value: displayBMR, trend: 'Metabolismo', color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Racha Semanal', value: metrics ? '1 Días' : '0 Días', trend: metrics ? '¡Sigue así!' : '¡Empieza hoy!', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-6 rounded-2xl border border-white shadow-sm hover:shadow-md transition`}>
            <p className="text-sm font-medium text-slate-600 mb-1">{stat.label}</p>
            <h3 className={`text-2xl font-bold ${stat.color}`}>{stat.value}</h3>
            <p className="text-xs text-slate-500 mt-2 font-semibold uppercase">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weight Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Evolución de Peso</h3>
            <select className="text-sm border-none bg-slate-50 rounded-lg px-2 py-1 outline-none">
              <option>Último mes</option>
              <option>Histórico</option>
            </select>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {sortedLogs.length > 0 ? (
                <AreaChart data={sortedLogs}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                </AreaChart>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Sin datos de peso registrados
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workout Tracker (Replaces Calories Chart) */}
        <div className="h-full">
          <WorkoutTracker
            userId={userId}
            userName={userName}
            onShare={onShare}
          />
        </div>
      </div>

      {/* Recent Activity */}
      {/* Recent Activity -> Now Hydration Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="font-bold text-slate-800">Logros Recientes</h3>
          </div>
          <div className="p-8 text-center text-slate-400 text-sm">
            <p>🔥 Racha de ejercicios activa</p>
            <p className="mt-2">💧 Hidratación en progreso</p>
          </div>
        </div>

        {/* Hydration Widget */}
        <div className="h-full">
          <HydrationTracker
            weight={userWeight}
            userName={userName}
            onShare={onShare}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
