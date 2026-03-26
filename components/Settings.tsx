import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';

interface SettingsProps {
    user: User;
    onUpdateUser: (updatedUser: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
    const [name, setName] = useState(user.name);
    const [surname, setSurname] = useState(user.surname || '');
    const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || '');
    const [avatar, setAvatar] = useState<string | undefined>(user.avatar);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Biometrics State
    const bio = user.biometrics || {};
    const [weight, setWeight] = useState(bio.weight || '');
    const [height, setHeight] = useState(bio.height || '');
    const [age, setAge] = useState(bio.age || '');
    const [gender, setGender] = useState(bio.gender || 'male');
    const [goal, setGoal] = useState(bio.goal || 'maintenance');
    const [activityLevel, setActivityLevel] = useState(bio.activityLevel || 'moderate');

    // Medical & Habits State
    const [medicalConditions, setMedicalConditions] = useState(bio.medicalConditions || bio.medical_conditions || '');
    const [allergies, setAllergies] = useState(bio.allergies || '');
    const [medications, setMedications] = useState(bio.medications || '');
    const [injuries, setInjuries] = useState(bio.injuries || '');
    const [sleepHours, setSleepHours] = useState(bio.sleepHours || bio.sleep_hours || '');
    const [stressLevel, setStressLevel] = useState(bio.stressLevel || bio.stress_level || 'moderate');
    const [waterIntake, setWaterIntake] = useState(bio.waterIntake || bio.water_intake || '');
    const [dailyMeals, setDailyMeals] = useState(bio.dailyMeals || bio.daily_meals || '');


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Password Validation
        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                alert("Las contraseñas no coinciden. Por favor verifícalas.");
                return;
            }
            if (newPassword.length < 6) {
                alert("La contraseña debe tener al menos 6 caracteres.");
                return;
            }
        }

        const updatedData: User = {
            ...user,
            name,
            surname,
            dateOfBirth,
            avatar,
            biometrics: {
                ...user.biometrics,
                weight: Number(weight),
                height: Number(height),
                age: Number(age),
                gender,
                goal,
                activityLevel,
                medicalConditions,
                allergies: allergies ? (typeof allergies === 'string' ? [allergies] : allergies) : undefined,
                medications,
                injuries,
                sleepHours: Number(sleepHours),
                stressLevel,
                waterIntake: Number(waterIntake),
                dailyMeals: Number(dailyMeals)
            } as any
        };

        // Update password only if changed
        if (newPassword) {
            updatedData.password = newPassword;
        }

        const saveChanges = async () => {
            try {
                await onUpdateUser(updatedData);
                setNewPassword('');
                setConfirmPassword('');
                alert("¡Datos y contraseña actualizados correctamente!");
            } catch (error) {
                console.error("Error saving settings:", error);
                alert("Hubo un error al guardar los cambios. Intenta nuevamente.");
            }
        };

        saveChanges();
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Configuración de Perfil</h1>
            <p className="text-slate-500 mb-8">Administra tus datos personales y apariencia.</p>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-100 bg-slate-50 shadow-inner">
                                {avatar ? (
                                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <i className="fas fa-user text-5xl"></i>
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                <i className="fas fa-camera text-white text-2xl"></i>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <p className="text-xs text-slate-400 mt-3 font-bold uppercase tracking-wider">Foto de Perfil</p>
                    </div>

                    {/* Personal Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Apellidos</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                            <input
                                type="email"
                                disabled
                                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
                                value={user.email}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Fecha de Nacimiento</label>
                            <input
                                type="date"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                value={dateOfBirth}
                                onChange={(e) => {
                                    const newDate = e.target.value;
                                    setDateOfBirth(newDate);
                                    if (newDate) {
                                        const birthDate = new Date(newDate);
                                        const today = new Date();
                                        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                                        const m = today.getMonth() - birthDate.getMonth();
                                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                            calculatedAge--;
                                        }
                                        setAge(calculatedAge.toString());
                                    }
                                }}
                            />
                        </div>

                        {/* Biometrics Section */}
                        {user.role !== UserRole.COACH && (
                            <div className="md:col-span-2 pt-6 border-t border-slate-100 mt-2">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <i className="fas fa-ruler-combined text-emerald-500"></i> Datos Físicos
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Peso (kg)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            placeholder="Ej. 70"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Altura (cm)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                            value={height}
                                            onChange={(e) => setHeight(e.target.value)}
                                            placeholder="Ej. 175"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Edad</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                            placeholder="Ej. 30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Género</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value as any)}
                                        >
                                            <option value="male">Hombre</option>
                                            <option value="female">Mujer</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Objetivo</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                            value={goal}
                                            onChange={(e) => setGoal(e.target.value as any)}
                                        >
                                            <option value="weight_loss">Pérdida de Peso</option>
                                            <option value="muscle_gain">Ganancia Muscular</option>
                                            <option value="maintenance">Mantenimiento</option>
                                            <option value="endurance">Resistencia</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Actividad</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                            value={activityLevel}
                                            onChange={(e) => setActivityLevel(e.target.value as any)}
                                        >
                                            <option value="sedentary">Sedentario (Poco o nada)</option>
                                            <option value="moderate">Moderado (3-5 veces/sem)</option>
                                            <option value="active">Activo (6-7 veces/sem)</option>
                                            <option value="athlete">Atleta (2x al día)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Medical & Habits Section */}
                        {user.role !== UserRole.COACH && (
                            <div className="md:col-span-2 pt-6 border-t border-slate-100 mt-2">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <i className="fas fa-heartbeat text-emerald-500"></i> Salud y Hábitos
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Patologías Médicas / Condiciones</label>
                                        <textarea
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition h-20 resize-none"
                                            placeholder="Diabetes, hipertensión, problemas tiroideos..."
                                            value={medicalConditions}
                                            onChange={(e) => setMedicalConditions(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Alergias e Intolerancias</label>
                                        <textarea
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition h-20 resize-none"
                                            placeholder="Gluten, lactosa, mariscos..."
                                            value={allergies}
                                            onChange={(e) => setAllergies(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Medicamentos Actuales</label>
                                        <textarea
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition h-20 resize-none"
                                            placeholder="Nombre y frecuencia..."
                                            value={medications}
                                            onChange={(e) => setMedications(e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Lesiones o Molestias Físicas</label>
                                        <textarea
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition h-20 resize-none"
                                            placeholder="Dolor de rodilla, hernia discal, etc..."
                                            value={injuries}
                                            onChange={(e) => setInjuries(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:col-span-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Horas de Sueño</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={sleepHours}
                                                onChange={(e) => setSleepHours(e.target.value)}
                                                placeholder="7"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Nivel de Estrés</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={stressLevel}
                                                onChange={(e) => setStressLevel(e.target.value)}
                                            >
                                                <option value="low">Bajo</option>
                                                <option value="moderate">Moderado</option>
                                                <option value="high">Alto</option>
                                                <option value="very_high">Muy Alto</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Agua (Litros/día)</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={waterIntake}
                                                onChange={(e) => setWaterIntake(e.target.value)}
                                                placeholder="2.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Comidas al día</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={dailyMeals}
                                                onChange={(e) => setDailyMeals(e.target.value)}
                                                placeholder="3-5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Password Section */}
                        <div className="md:col-span-2 pt-6 border-t border-slate-100 mt-2">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-lock text-emerald-500"></i> Seguridad
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                        placeholder="Min. 6 caracteres"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirmar Contraseña</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                        placeholder="Repite la contraseña"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <button
                            type="submit"
                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
