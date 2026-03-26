import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface CookingOverlayProps {
    isVisible: boolean;
}

const FUN_MESSAGES = [
    "Consultando con chefs expertos...",
    "Calculando tus macros...",
    "Picando cebollas orgánicas...",
    "Sazonando con inteligencia artificial...",
    "Ajustando las porciones...",
    "Buscando las mejores recetas...",
    "¡Casi listo para servir!",
    "Optimizando para tu objetivo..."
];

const CookingOverlay: React.FC<CookingOverlayProps> = ({ isVisible }) => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % FUN_MESSAGES.length);
        }, 2500);

        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md transition-all duration-500">
            <div className="relative mb-8">
                {/* Animated Circle Background */}
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>

                {/* Icon Container */}
                <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                    <i className="fas fa-utensils text-5xl text-emerald-600 animate-spin-slow"></i>
                </div>

                {/* Floating Particles/Bubbles */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s] flex items-center justify-center">
                    <i className="fas fa-carrot text-white text-xs"></i>
                </div>
                <div className="absolute bottom-0 -left-6 w-10 h-10 bg-red-500 rounded-full animate-bounce [animation-delay:-0.5s] flex items-center justify-center">
                    <i className="fas fa-apple-alt text-white text-sm"></i>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 text-center animate-fade-in px-4">
                Diseñando tu Menú Semanal
            </h2>

            <p className="text-emerald-300 text-lg font-medium min-h-[1.5em] text-center px-4 animate-pulse">
                {FUN_MESSAGES[messageIndex]}
            </p>

            {/* Progress Bar (Fake) */}
            <div className="w-64 h-2 bg-slate-700 rounded-full mt-8 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-300 animate-progress-indeterminate"></div>
            </div>

            <p className="text-slate-400 text-xs mt-4">
                Esto puede tomar unos segundos...
            </p>
        </div>,
        document.body
    );
};

export default CookingOverlay;
