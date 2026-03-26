import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { userService, subscriptionService } from '../services/api';

interface UnifiedRequest {
    id: string | number;
    type: 'new_registration' | 'legacy_upgrade';
    userName: string;
    userEmail?: string;
    coachName?: string;
    requestedPlan: string;
    tokens: number;
    amount?: string;
    originalUser?: User; // For new registrations
    legacyId?: number;   // For legacy requests
}

const SubscriptionValidation: React.FC = () => {
    const [requests, setRequests] = useState<UnifiedRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState<Record<string, string>>({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allUsers, legacyData] = await Promise.all([
                userService.getAllUsers(),
                subscriptionService.getPendingRequests()
            ]);

            const unified: UnifiedRequest[] = [];

            // 1. Process New Registrations (Coach Created)
            if (Array.isArray(allUsers)) {
                allUsers.filter(u => u.pendingPlan).forEach(u => {
                    unified.push({
                        id: u.id,
                        type: 'new_registration',
                        userName: u.name,
                        userEmail: u.email,
                        coachName: u.coachName || 'Desconocido',
                        requestedPlan: u.pendingPlan || 'pro',
                        tokens: u.pendingPlan === 'pro_master' ? 1500 : 750,
                        amount: u.pendingPlan === 'pro_master' ? '9.99' : '6.99',
                        originalUser: u
                    });
                });
            }

            // 2. Process Legacy Requests (Self-Service)
            if (legacyData && Array.isArray(legacyData.requests)) {
                // We need to fetch user details for these legacy requests if not included
                // Assuming legacyData.requests includes joined user info or we just show what we have
                // Check structure based on previous dump: { user_id, requested_role, amount... }
                // Need to find user name?
                // Let's assume we map from allUsers if possible
                legacyData.requests.forEach((req: any) => {
                    const user = allUsers.find(u => u.id === req.user_id);
                    unified.push({
                        id: `legacy - ${req.id} `,
                        type: 'legacy_upgrade',
                        userName: user ? user.name : 'Usuario Desconocido',
                        userEmail: user?.email,
                        coachName: user?.coachName,
                        requestedPlan: req.requested_role,
                        tokens: req.requested_role === 'pro_master' || req.requested_role === 'vip' ? 1500 : 750,
                        amount: req.amount,
                        legacyId: req.id
                    });
                });
            }

            setRequests(unified);
        } catch (err) {
            console.error("Failed to fetch validation data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (req: UnifiedRequest) => {
        const note = notes[req.id] || '';
        if (!window.confirm(`¿Confirmar activación para ${req.userName}?`)) return;

        try {
            if (req.type === 'new_registration' && req.originalUser) {
                // New Flow: Use dedicated endpoint that handles pending_plan clearing + income logging
                // req.id IS the userId (string) for new_registration types
                await subscriptionService.approveRegistration(req.id as string, req.requestedPlan as 'pro' | 'pro_master');
            } else if (req.type === 'legacy_upgrade' && req.legacyId) {
                // Legacy Flow
                await subscriptionService.respondToRequest(req.legacyId, 'approved', note);
            }

            // Remove from UI
            setRequests(prev => prev.filter(r => r.id !== req.id));
            alert('¡Validación exitosa!');
        } catch (err) {
            console.error('Error validating', err);
            alert('Error al validar');
        }
    };

    const handleReject = async (req: UnifiedRequest) => {
        const note = notes[req.id] || '';
        if (!window.confirm(`¿Rechazar solicitud de ${req.userName}?`)) return;

        try {
            if (req.type === 'new_registration' && req.originalUser) {
                await userService.updateProfile(req.originalUser.id, { pendingPlan: null });
            } else if (req.type === 'legacy_upgrade' && req.legacyId) {
                await subscriptionService.respondToRequest(req.legacyId, 'rejected', note);
            }
            setRequests(prev => prev.filter(r => r.id !== req.id));
        } catch (err) {
            console.error('Error rejecting', err);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-400">Cargando solicitudes...</div>;

    return (
        <div className="space-y-6 animate-fadeIn">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">Validación de Pagos</h2>
                    <p className="text-slate-400 text-sm font-bold mt-1">
                        {requests.length} solicitudes pendientes
                    </p>
                </div>
            </header>

            {requests.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-check-double text-2xl"></i>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">¡Todo al día!</h3>
                    <p className="text-slate-400">No hay pagos pendientes de validación.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center gap-6 hover:shadow-md transition">
                            {/* User Info */}
                            <div className="flex items-center gap-4 flex-1 w-full">
                                <div className={`w - 12 h - 12 rounded - full flex items - center justify - center font - bold ${req.type === 'legacy_upgrade' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'} `}>
                                    {req.userName.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between md:justify-start items-center gap-2">
                                        <h4 className="font-bold text-slate-800 text-lg">{req.userName}</h4>
                                        {req.type === 'legacy_upgrade' && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 rounded-full font-bold">LEGACY</span>}
                                    </div>
                                    <p className="text-xs text-slate-400">{req.userEmail}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">Coach: {req.coachName || '-'}</span>
                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                                            <i className="fas fa-tag"></i> Plan: {req.requestedPlan.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes Input */}
                            <div className="w-full lg:w-1/3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Notas de Admin</label>
                                <input
                                    type="text"
                                    placeholder="Anotaciones opcionales..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={notes[req.id] || ''}
                                    onChange={(e) => setNotes({ ...notes, [req.id]: e.target.value })}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                                <div className="text-right mr-4 hidden xl:block">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Solicita</p>
                                    <p className="font-black text-slate-800 text-lg">
                                        {req.tokens} TK
                                    </p>
                                    {req.amount && <p className="text-[10px] text-emerald-600 font-bold">${req.amount}</p>}
                                </div>

                                <button
                                    onClick={() => handleReject(req)}
                                    className="px-4 py-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 font-bold text-sm transition"
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleApprove(req)}
                                    className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-200 transition transform hover:scale-105"
                                >
                                    <i className="fas fa-check-circle mr-2"></i> {req.type === 'legacy_upgrade' ? 'Aprobar' : 'Validar'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SubscriptionValidation;
