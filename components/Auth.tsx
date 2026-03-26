
import React, { useState } from 'react';
import CoachLanding from './CoachLanding';
import { BiometricData, UserRole } from '../types';
import { authService } from '../services/api';

interface AuthProps {
  onLogin: (userData: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'login' | 'register' | 'onboarding' | 'coach_landing'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [coachId, setCoachId] = useState(''); // New State
  const [isReferralLocked, setIsReferralLocked] = useState(false); // Helper state for UI lock
  const [selectedPlan, setSelectedPlan] = useState<UserRole>(UserRole.FREE);
  const [biometrics, setBiometrics] = useState<Partial<BiometricData>>({
    weight: 75,
    height: 175,
    age: 25,
    gender: 'male',
    goal: 'maintenance',
    activityLevel: 'moderate'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check URL for coachId on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cId = params.get('coachId');
    if (cId) {
      setCoachId(cId);
      setIsReferralLocked(true); // Lock it
      // Optional: auto-switch to register if link is used?
      if (step === 'login') setStep('register');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // 0. Hardcoded Admin Check (Legacy/Backdoor)
    if (email === 'superadmin@nutrifit.ai' && password === 'super123') {
      // ... existing superadmin logic can be kept or removed. Let's keep a simplified version for safety or remove if strict.
      // For now, let's try API first, if it fails, fallback? No, let's stick to API.
    }

    try {
      const response = await authService.login(email, password);
      onLogin(response.user);
    } catch (err: any) {
      console.error("Login failed", err);
      setError(err.response?.data?.message || 'Error al iniciar sesión');
      // Fallback for demo users if API fails? 
      // If the user wants "Production Backend", we should rely on it.
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const userData = {
        email,
        password, // We need to capture password during register step!
        // Wait, the UI splits register into "Email/Password" then "Onboarding".
        // Where is password stored? 'password' state.
        name: name || 'Nuevo Usuario',
        role: selectedPlan,
        planType: selectedPlan === UserRole.PRO_MASTER ? 'pro_master' : selectedPlan === UserRole.PRO ? 'pro' : 'free',
        coachId: coachId || undefined // Send if exists
      };

      const response = await authService.register(userData);
      onLogin(response.user);
    } catch (err: any) {
      console.error("Register failed", err);
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'coach_landing') {
    return <CoachLanding onBack={() => setStep('login')} />;
  }

  if (step === 'onboarding') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="md:w-1/3 bg-emerald-600 p-8 text-white flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">Casi listo...</h2>
              <p className="text-emerald-100 text-sm">Necesitamos estos datos para que nuestra IA calcule tus necesidades exactas.</p>
            </div>
            <div className="hidden md:block">
              <i className="fas fa-heartbeat text-6xl opacity-20"></i>
            </div>
          </div>
          <form onSubmit={handleOnboardingSubmit} className="md:w-2/3 p-8 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre Completo</label>
              <input
                type="text"
                placeholder="Ej: Juan Pérez"
                className="w-full bg-slate-50 border-none rounded-xl p-3"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Edad</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border-none rounded-xl p-3"
                  value={biometrics.age}
                  onChange={e => setBiometrics({ ...biometrics, age: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Género</label>
                <select
                  className="w-full bg-slate-50 border-none rounded-xl p-3"
                  value={biometrics.gender}
                  onChange={e => setBiometrics({ ...biometrics, gender: e.target.value as any })}
                >
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Peso (kg)</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border-none rounded-xl p-3"
                  value={biometrics.weight}
                  onChange={e => setBiometrics({ ...biometrics, weight: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Altura (cm)</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border-none rounded-xl p-3"
                  value={biometrics.height}
                  onChange={e => setBiometrics({ ...biometrics, height: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tu Objetivo Principal</label>
              <select
                className="w-full bg-slate-50 border-none rounded-xl p-3"
                value={biometrics.goal}
                onChange={e => setBiometrics({ ...biometrics, goal: e.target.value as any })}
              >
                <option value="weight_loss">Perder Grasa</option>
                <option value="muscle_gain">Ganar Músculo</option>
                <option value="maintenance">Mantenerse en forma</option>
                <option value="endurance">Resistencia / Atleta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Unirse como (Demo)</label>
              <select
                className="w-full bg-slate-50 border-none rounded-xl p-3 border-2 border-emerald-100 focus:border-emerald-500"
                value={selectedPlan}
                onChange={e => setSelectedPlan(e.target.value as UserRole)}
              >
                <option value={UserRole.FREE}>Plan Gratuito (Básico)</option>
                <option value={UserRole.PRO}>Plan PRO (Semanal)</option>
                <option value={UserRole.PRO_MASTER}>Plan MASTER (Premium)</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                ID de Coach (Referido) <span className="text-emerald-500 font-normal normal-case ml-1">{coachId ? '(Detectado)' : ''}</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: coach123"
                  className={`w-full bg-slate-50 border-none rounded-xl p-3 ${coachId && isReferralLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-2 border-emerald-500/50' : coachId ? 'border-2 border-emerald-500 bg-emerald-50' : ''}`}
                  value={coachId}
                  onChange={e => !isReferralLocked && setCoachId(e.target.value)}
                  readOnly={isReferralLocked}
                />
                {isReferralLocked && (
                  <div className="absolute right-3 top-3 text-emerald-500" title="Link de referido bloqueado">
                    <i className="fas fa-lock"></i>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isReferralLocked ? 'Estás registrándote con un link de referido oficial. No puedes cambiar el ID.' : 'Si tienes un coach, ingresa su ID único aquí para vincular tu cuenta.'}
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                {error}
              </div>
            )}
            <button
              disabled={isLoading}
              className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold transition shadow-lg shadow-emerald-600/20 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Creando cuenta...' : 'Comenzar mi transformación'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10">
        <div className="text-center mb-10">
          <div className="w-80 h-80 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-0 overflow-hidden">
            <img src="/logo_black.png" alt="NutriFit AI" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">NutriFit AI</h1>
          <p className="text-slate-500 mt-2">Tu coach inteligente de nutrición</p>
        </div>



        <form onSubmit={step === 'login' ? handleLogin : (e) => { e.preventDefault(); setStep('onboarding'); }} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Correo electrónico"
              className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold transition shadow-lg shadow-emerald-600/20 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Procesando...' : (step === 'login' ? 'Si ya eres coach o cliente - Inicia Sesion' : <span className="flex items-center justify-center gap-2">Registrarme como cliente - Siguiente Paso <i className="fas fa-arrow-right"></i></span>)}
          </button>
        </form>

        <div className="mt-8 text-center text-sm border-t border-slate-100 pt-6">
          {step === 'login' ? (
            <div className="space-y-4">
              <p className="text-slate-500">
                ¿No tienes cuenta? {' '}
                <button onClick={() => setStep('register')} className="text-emerald-600 font-bold hover:underline">Regístrate gratis</button>
              </p>

            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-500">
                ¿Ya tienes cuenta? {' '}
                <button onClick={() => setStep('login')} className="text-emerald-600 font-bold hover:underline">Inicia sesión</button>
              </p>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-slate-600 text-sm mb-2">
                  ¿Eres Coach de vida saludable y aun no formas parte de NutriFit AI?
                </p>
                <button
                  onClick={() => setStep('coach_landing')}
                  className="text-emerald-600 font-bold hover:underline text-sm"
                >
                  Descubre cómo escalar tu negocio con el poder de nuestra IA. [Haz clic aquí]
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
