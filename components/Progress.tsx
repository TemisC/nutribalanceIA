
import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { ProgressLog, BodyMeasurements } from '../types';

interface ProgressProps {
  logs: ProgressLog[];
  onAddLog: (log: ProgressLog) => void;
}

const Progress: React.FC<ProgressProps> = ({ logs, onAddLog }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    weight: '',
    waist: '',
    chest: '',
    hips: '',
    neck: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: ProgressLog = {
      date: new Date().toISOString().split('T')[0],
      weight: parseFloat(formData.weight),
      caloriesConsumed: 0, // Placeholder
      measurements: {
        weight: parseFloat(formData.weight),
        waist: formData.waist ? parseFloat(formData.waist) : undefined,
        chest: formData.chest ? parseFloat(formData.chest) : undefined,
        hips: formData.hips ? parseFloat(formData.hips) : undefined,
        neck: formData.neck ? parseFloat(formData.neck) : undefined,
      }
    };
    onAddLog(newLog);
    setShowForm(false);
    setFormData({ weight: '', waist: '', chest: '', hips: '', neck: '' });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Mi Evolución Física</h1>
          <p className="text-slate-500 mt-1">Controla tus medidas y peso para ajustar tu plan.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i>
          {showForm ? 'Cancelar' : 'Registrar Medida'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-6 animate-fadeIn">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Peso (kg)</label>
            <input
              required
              type="number" step="0.1"
              className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
              value={formData.weight}
              onChange={e => setFormData({ ...formData, weight: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cintura (cm)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
              value={formData.waist}
              onChange={e => setFormData({ ...formData, waist: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pecho (cm)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
              value={formData.chest}
              onChange={e => setFormData({ ...formData, chest: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cadera (cm)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
              value={formData.hips}
              onChange={e => setFormData({ ...formData, hips: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cuello (cm)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
              value={formData.neck}
              onChange={e => setFormData({ ...formData, neck: e.target.value })}
            />
          </div>
          <div className="md:col-span-5 flex justify-end">
            <button type="submit" className="bg-slate-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-slate-800 transition">
              Guardar Registro
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-xl text-slate-800 mb-8">Gráfica de Peso</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={logs}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorWeight)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Historial de Mediciones</h3>
            <span className="text-xs text-slate-400 font-bold uppercase">{logs.length} Entradas</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Peso</th>
                <th className="px-6 py-4">Cintura</th>
                <th className="px-6 py-4">Pecho</th>
                <th className="px-6 py-4">Cadera</th>
                <th className="px-6 py-4">Cuello</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.slice().reverse().map((log, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{log.date}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">{log.weight} kg</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{log.measurements?.waist || '-'} cm</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{log.measurements?.chest || '-'} cm</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{log.measurements?.hips || '-'} cm</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{log.measurements?.neck || '-'} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Progress;
