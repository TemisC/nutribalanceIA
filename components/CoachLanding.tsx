import React from 'react';

const CoachLanding: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-x-hidden">
            {/* Navbar Overlay */}
            <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50 max-w-7xl left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="mr-4 w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center text-white transition border border-slate-700 backdrop-blur-sm"
                        title="Volver"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="w-24 h-24 rounded-lg flex items-center justify-center rotate-0 overflow-hidden">
                        <img src="/logo_v2.png" alt="NutriFit AI" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">NutriFit AI <span className="text-emerald-400">Coach</span></span>
                </div>
                <button
                    onClick={onBack}
                    className="text-sm font-bold text-slate-300 hover:text-white transition"
                >
                    Iniciar Sesión
                </button>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-32 pb-20 px-6">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-1/2 h-full bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <div className="md:w-1/2 text-left">
                        <div className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                            <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
                                <i className="fas fa-sparkles mr-2"></i>La evolución del fitness coaching
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                            Escala tu negocio de <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                                Coaching Online
                            </span>
                        </h1>
                        <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-lg">
                            Deja de usar Excel y WhatsApp. Automatiza planes de alimentación, seguimiento y soporte 24/7 con nuestra Inteligencia Artificial.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition transform hover:-translate-y-1 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
                                Solicitar Acceso Demo
                                <i className="fas fa-arrow-right"></i>
                            </button>
                            <button onClick={onBack} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition border border-slate-700">
                                Ya tengo cuenta
                            </button>
                        </div>
                        <div className="mt-10 flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs">
                                        <i className="fas fa-user"></i>
                                    </div>
                                ))}
                            </div>
                            <p>Más de <span className="text-white font-bold">500 coaches</span> confían en nosotros</p>
                        </div>
                    </div>

                    <div className="md:w-1/2 relative">
                        {/* Abstract UI representation */}
                        <div className="relative bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl rotate-2 hover:rotate-0 transition duration-500">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <div className="h-2 w-20 bg-slate-700 rounded-full"></div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-1/3 h-24 bg-slate-700/50 rounded-xl animate-pulse"></div>
                                    <div className="w-2/3 space-y-3">
                                        <div className="h-4 w-full bg-slate-700/50 rounded-full"></div>
                                        <div className="h-4 w-3/4 bg-slate-700/50 rounded-full"></div>
                                        <div className="h-4 w-1/2 bg-slate-700/50 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="h-32 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-center items-center">
                                    <i className="fas fa-robot text-3xl text-emerald-400 mb-2"></i>
                                    <p className="text-emerald-400 font-bold text-sm">Generando Plan Semanal...</p>
                                </div>
                            </div>

                            {/* Floating Cards */}
                            <div className="absolute -left-8 top-1/2 bg-white text-slate-900 p-4 rounded-xl shadow-xl border-l-4 border-emerald-500 animate-bounce">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                        <i className="fas fa-check"></i>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Cliente Habilitado</p>
                                        <p className="text-xs text-slate-500">Plan enviado</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section className="py-20 bg-slate-800/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Todo lo que necesitas para crecer</h2>
                        <p className="text-slate-400">Una suite completa de herramientas diseñadas para el coach moderno.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: "fa-brain",
                                title: "IA Generativa",
                                desc: "Crea planes de alimentación y entrenamiento personalizados en segundos, no horas.",
                                color: "text-purple-400"
                            },
                            {
                                icon: "fa-comments",
                                title: "Asistente 24/7",
                                desc: "Un clon de ti mismo (IA) responde dudas básicas de tus clientes mientras duermes.",
                                color: "text-blue-400"
                            },
                            {
                                icon: "fa-chart-line",
                                title: "Escalabilidad Real",
                                desc: "Gestiona 50, 100 o más clientes sin perder calidad en el servicio ni en tu vida.",
                                color: "text-emerald-400"
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-slate-900 p-8 rounded-3xl border border-slate-700 hover:border-emerald-500/50 transition group">
                                <div className={`w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl mb-6 ${feature.color} group-hover:scale-110 transition`}>
                                    <i className={`fas ${feature.icon}`}></i>
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-black mb-6">¿Listo para modernizar tu coaching?</h2>
                        <p className="text-emerald-100 text-lg mb-10 max-w-2xl mx-auto">
                            Únete a la lista de espera exclusiva para coaches fundadores y obtén tarifas preferenciales de por vida.
                        </p>
                        <button className="bg-white text-emerald-700 px-10 py-5 rounded-2xl font-black text-xl hover:bg-emerald-50 transition shadow-xl">
                            Aplicar Ahora
                        </button>
                        <p className="mt-6 text-emerald-200 text-sm opacity-80">
                            Sin tarjeta de crédito requerida • Cancelación en cualquier momento
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-12 px-6 text-center text-slate-500 text-sm">
                <p>&copy; 2026 NutriFit AI Pro. Todos los derechos reservados.</p>
                <div className="flex justify-center gap-6 mt-4">
                    <a href="#" className="hover:text-emerald-400 transition">Términos</a>
                    <a href="#" className="hover:text-emerald-400 transition">Privacidad</a>
                    <a href="#" className="hover:text-emerald-400 transition">Soporte</a>
                </div>
            </footer>
        </div>
    );
};

export default CoachLanding;
