import React from 'react';
import { UserRole } from '../types';
import { subscriptionService } from '../services/api';

interface PricingProps {
    currentRole: UserRole; // Legacy, kept for compatibility if needed, but planType is preferred
    currentPlanType?: string; // NEW
    currentUserId: string;
    onUpgrade: (role: UserRole) => void;
    pendingPlan?: 'pro' | 'pro_master' | null;
}

const Pricing: React.FC<PricingProps> = ({ currentRole, currentPlanType, currentUserId, onUpgrade, pendingPlan }) => {
    // Fallback: use currentRole if planType is missing (for legacy 'free'/'pro' roles)
    const activePlan = currentPlanType || currentRole;
    const plans = [
        {
            id: 'free',
            role: UserRole.FREE,
            name: 'Gratis',
            price: '$0',
            period: '/mes',
            features: ['Registro de peso básico', '3 Consultas IA al día', 'Comunidad (lectura)'],
            color: 'slate',
            cta: 'Tu plan actual',
            disabled: true
        },
        {
            id: 'pro',
            role: UserRole.PRO,
            name: 'Pro',
            price: '$6.99',
            period: '/mes',
            features: ['Consultas IA ilimitadas', 'Plan de comidas semanal', 'Lista de compras', 'Análisis de fotos de comida'],
            color: 'emerald',
            cta: 'Suscribirse a Pro',
            recommended: true
        },
        {
            id: 'pro_master',
            role: UserRole.PRO_MASTER,
            name: 'Pro Master',
            price: '$9.99',
            period: '/mes',
            features: ['Todo lo de Pro', 'Entrenador personal IA', 'Videollamadas mensuales', 'Acceso anticipado a features'],
            color: 'purple',
            cta: 'Ser Master',
        }
    ];

    const [selectedPayment, setSelectedPayment] = React.useState<{ role: UserRole, amount: number, mpLink: string, ppLink: string } | null>(null);

    // Auto-open modal if pendingPlan exists
    React.useEffect(() => {
        if (pendingPlan) {
            const targetPlan = plans.find(p => p.id === pendingPlan || p.role === pendingPlan);
            if (targetPlan && targetPlan.id !== 'free') {
                // Simulate click logic
                let mpLink = '';
                let ppLink = '';
                let role = targetPlan.role;
                let amount = 0;

                if (targetPlan.id === 'pro') {
                    mpLink = 'https://mpago.la/2QJMvwS';
                    ppLink = 'https://www.paypal.com/ncp/payment/ZAL8NT3UKF2HA';
                    amount = 6.99;
                } else if (targetPlan.id === 'pro_master') {
                    mpLink = 'https://mpago.la/1YeFUzN';
                    ppLink = 'https://www.paypal.com/ncp/payment/EG6DPRUEQTZN2';
                    amount = 9.99;
                }

                if (mpLink && ppLink) {
                    setSelectedPayment({ role, amount, mpLink, ppLink });
                }
            }
        }
    }, [pendingPlan]);

    const handlePayment = async (location: 'uy' | 'int') => {
        if (!selectedPayment) return;

        const link = location === 'uy' ? selectedPayment.mpLink : selectedPayment.ppLink;
        window.open(link, '_blank');
        setSelectedPayment(null);

        try {
            await subscriptionService.createRequest(currentUserId, selectedPayment.role, selectedPayment.amount);
            alert("⚠️ Tu suscripción está pendiente de validación.\n\nCompleta el pago en la nueva pestaña y notifica al administrador para activar tu plan Premium.");
        } catch (e) {
            console.error(e);
            alert("Error registrando solicitud.");
        }
    };

    return (
        <div className="p-10 max-w-6xl mx-auto">
            {selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scaleIn">
                        <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">Selecciona tu ubicación</h3>
                        <p className="text-slate-500 text-center text-sm mb-6">Elige el método de pago disponible para tu región.</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handlePayment('uy')}
                                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition group"
                            >
                                <span className="font-bold text-slate-700 group-hover:text-blue-600">🇺🇾 Uruguay</span>
                                <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded">Mercado Pago</span>
                            </button>

                            <button
                                onClick={() => handlePayment('int')}
                                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition group"
                            >
                                <span className="font-bold text-slate-700 group-hover:text-indigo-600">🌍 Internacional</span>
                                <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded">PayPal</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setSelectedPayment(null)}
                            className="w-full mt-6 text-slate-400 font-bold text-sm hover:text-slate-600"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-slate-800 mb-4">Invierte en tu Salud</h1>
                <p className="text-slate-500 max-w-2xl mx-auto">Elige el plan que mejor se adapte a tus objetivos. Cancela cuando quieras.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
                {plans.map((plan) => (
                    <div key={plan.id} className={`relative bg-white rounded-3xl p-8 border-2 transition hover:-translate-y-2 duration-300
            ${plan.recommended ? 'border-emerald-500 shadow-xl shadow-emerald-100 z-10' : 'border-slate-100 shadow-lg'}
          `}>
                        {plan.recommended && (
                            <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                Más Popular
                            </span>
                        )}
                        <h3 className={`text-xl font-bold mb-2 text-${plan.color === 'purple' ? 'purple-600' : plan.color === 'emerald' ? 'emerald-600' : 'slate-600'}`}>
                            {plan.name}
                        </h3>
                        <div className="flex items-baseline mb-6">
                            <span className="text-4xl font-bold text-slate-800">{plan.price}</span>
                            <span className="text-slate-400 ml-2">{plan.period}</span>
                        </div>

                        <ul className="space-y-4 mb-8">
                            {plan.features.map((feat, i) => (
                                <li key={i} className="flex items-center text-sm text-slate-600">
                                    <i className={`fas fa-check-circle mr-3 text-${plan.color === 'purple' ? 'purple-500' : 'emerald-500'}`}></i>
                                    {feat}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => {
                                if (plan.id === 'free') return; // Cannot subscribe to free

                                let mpLink = '';
                                let ppLink = '';
                                let role = plan.role;
                                let amount = 0;

                                if (plan.id === 'pro') {
                                    mpLink = 'https://mpago.la/2QJMvwS';
                                    ppLink = 'https://www.paypal.com/ncp/payment/ZAL8NT3UKF2HA';
                                    amount = 6.99;
                                } else if (plan.id === 'pro_master') {
                                    mpLink = 'https://mpago.la/1YeFUzN';
                                    ppLink = 'https://www.paypal.com/ncp/payment/EG6DPRUEQTZN2';
                                    amount = 9.99;
                                }

                                if (mpLink && ppLink) {
                                    setSelectedPayment({ role, amount, mpLink, ppLink });
                                }
                            }}
                            disabled={plan.id === 'free' || activePlan === plan.id || activePlan === plan.role}
                            className={`w-full py-4 rounded-xl font-bold transition
                ${(activePlan === plan.id || activePlan === plan.role || plan.id === 'free')
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : plan.id === 'pro_master'
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'
                                }
              `}
                        >
                            {activePlan === plan.id || activePlan === plan.role ? 'Plan Actual' : plan.id === 'free' ? 'Plan Inicial' : 'Suscribirse Ahora'}
                        </button>
                    </div>
                ))}
            </div>
        </div >
    );
};

export default Pricing;
