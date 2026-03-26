import React from 'react';
// import { Lock } from 'lucide-react'; // Removed dependency

interface PaymentRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PaymentRequiredModal: React.FC<PaymentRequiredModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 transform transition-all scale-100 relative overflow-hidden">

                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-xl"></div>

                <div className="flex flex-col items-center text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
                        <i className="fas fa-lock text-3xl text-red-600 dark:text-red-400"></i>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Acceso Restringido
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                        Vaya, parece que no has pagado tu cuota de mes. <br />
                        <span className="font-semibold text-red-500">Ponte al día</span> para que se habilite tu sesión.
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-gray-900 to-gray-700 hover:from-black hover:to-gray-800 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-gray-400/20"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentRequiredModal;
