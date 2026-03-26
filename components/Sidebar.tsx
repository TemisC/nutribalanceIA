import React from 'react';
import { User, UserRole } from '../types';
import PaymentRequiredModal from './PaymentRequiredModal';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  pendingValidations?: number; // New prop
  pendingCommunityPosts?: number; // New prop
  isOpen?: boolean; // Mobile State
  onClose?: () => void; // Mobile Close
}

// Define interface for menu items to avoid TypeScript errors with the optional badge property
interface MenuItem {
  id: string;
  icon: string;
  label: string;
  badge?: number | string;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, pendingValidations = 0, pendingCommunityPosts = 0, isOpen = false, onClose }) => {
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN || user.role === UserRole.COACH;
  const unreadCount = user.messages?.filter(m => !m.read).length || 0;
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);

  // Explicitly type menu arrays as MenuItem[] to ensure 'badge' is recognized as an optional property
  const userMenuItems: MenuItem[] = [
    { id: 'community', icon: 'fa-users-rays', label: 'Comunidad' },
    { id: 'dashboard', icon: 'fa-chart-line', label: 'Panel Principal' },
    { id: 'physical-data', icon: 'fa-ruler-combined', label: 'Mis Datos Físicos' },
    { id: 'meal-plan', icon: 'fa-utensils', label: 'Plan de Comidas' },
    { id: 'shopping', icon: 'fa-shopping-basket', label: 'Lista de Compras' },
    { id: 'chat-nutrition', icon: 'fa-user-md', label: 'Chat Nutrición' },
    { id: 'chat-trainer', icon: 'fa-dumbbell', label: 'Chat Entrenador' },
    { id: 'vision', icon: 'fa-camera', label: 'Escaner de Comidas' },
    { id: 'inbox', icon: 'fa-envelope', label: 'Buzón', badge: unreadCount },
    { id: 'progress', icon: 'fa-weight', label: 'Mis Medidas' },
    { id: 'settings', icon: 'fa-cog', label: 'Configuración' },
  ];

  const adminMenuItems: MenuItem[] = [
    { id: 'admin', icon: 'fa-user-shield', label: user.role === UserRole.COACH ? 'Panel Coach' : 'Gestión Global' },
    { id: 'admin-users', icon: 'fa-users', label: user.role === UserRole.COACH ? 'Mis Alumnos' : 'Directorios' },
    // Coach Inbox
    ...(user.role === UserRole.COACH ? [{ id: 'inbox', icon: 'fa-envelope', label: 'Buzón', badge: unreadCount }] : []),
    { id: 'admin-community', icon: 'fa-globe-americas', label: 'Comunidad', badge: pendingCommunityPosts > 0 ? pendingCommunityPosts : undefined },
    // Only show Validation for REAL Admins (Not Coaches)
    ...(user.role !== UserRole.COACH ? [{ id: 'admin-subscriptions', icon: 'fa-file-invoice-dollar', label: 'Validación', badge: pendingValidations > 0 ? pendingValidations : undefined }] : []),
    ...(user.role !== UserRole.COACH ? [{ id: 'admin-stats', icon: 'fa-chart-pie', label: 'Métricas' }] : []),
  ];

  const currentMenuItems = isAdmin
    ? (user.role === UserRole.COACH
      // Merge Admin Items with specific User Tools for Coaches
      ? [...adminMenuItems, ...userMenuItems.filter(i => ['chat-nutrition', 'chat-trainer', 'vision', 'meal-plan', 'settings'].includes(i.id))]
      : adminMenuItems)
    : userMenuItems;
  const isInactive = user.status === 'inactive';

  // Handler to close sidebar on item click (mobile only)
  const handleMobileItemClick = (itemId: string) => {
    setActiveTab(itemId);
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  /* ... interception logic ... */
  const handleIntercept = (e: React.MouseEvent) => {
    // ... logic ...
  };

  return (
    <>
      <PaymentRequiredModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-fadeIn"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-slate-900 text-white flex flex-col shadow-2xl 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:h-screen
      `} onClickCapture={handleIntercept}>
        <div className="p-6 text-2xl font-bold flex items-center gap-2">
          <div className="w-28 h-28 rounded-xl flex items-center justify-center rotate-0 overflow-hidden">
            <img src="/logo_v2.png" alt="NutriFit AI" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl">NutriFit</span>
            <span className="text-emerald-400 text-sm tracking-widest uppercase font-black">AI Pro</span>
          </div>
        </div>

        <div className="p-4 mt-auto">
          <button
            onClick={() => setActiveTab('pricing')}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-xl shadow-lg relative overflow-hidden group text-left"
            disabled={isInactive}
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition"></div>
            <div className="relative flex flex-col items-start w-full">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 mb-1">
                {user.role === UserRole.COACH ? 'Nivel de Partner :' : 'Mi plan actual :'}
                <span className="text-white ml-1 font-black">
                  {user.role === UserRole.COACH
                    ? ((user.coachTier || user.coach_tier) === 'vip_plus' ? 'VIP Plus' : 'VIP')
                    : (user?.role === 'pro_master' ? 'PRO Master' : user?.role === 'pro' ? 'Pro' : 'Free')
                  }
                </span>
              </div>

              {(user?.role === 'free' || user?.role === 'pro') ? (
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-sm"><i className="fas fa-crown mr-2 text-yellow-300"></i> Mejorar Plan</span>
                  <i className="fas fa-arrow-right text-sm"></i>
                </div>
              ) : (
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm text-white"><i className="fas fa-check-circle mr-2 text-emerald-200"></i> Plan Activo</span>
                  </div>
                  {user.coachName && !isAdmin && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-[10px] text-emerald-100 uppercase font-bold">Tu Coach es:</p>
                      <p className="text-sm font-black text-white truncate">{user.coachName}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </button>
        </div>
        <div className="px-6 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter mb-1">Estado de Cuenta</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fas fa-coins text-amber-400 text-xs"></i>
                <span className="text-lg font-black text-emerald-400">
                  {isAdmin && user.role !== UserRole.COACH ? 'ILIMITADO' : `${user.tokens} Tk`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {currentMenuItems.map((item) => {
            const isRestricted = user.planType === 'pro' && ['chat-trainer', 'vision'].includes(item.id);
            const isLockedGlobal = isRestricted && user.role !== UserRole.COACH && !isAdmin;

            // Permissions Logic (Legacy + New)
            const isLocked = (() => {
              if (isLockedGlobal) return true;
              if (user.role === UserRole.FREE) {
                if (item.id === 'chat-trainer' || item.id === 'vision') return true;
              }
              if (user.role === UserRole.PRO) {
                if (item.id === 'chat-trainer') return true;
              }
              return false;
            })();

            const handleItemClick = () => {
              if (isInactive) return;

              if (isLocked) {
                if (user.role === UserRole.FREE) {
                  if (window.confirm("Esta función es exclusiva para usuarios PRO. ¿Deseas mejorar tu plan?")) {
                    setActiveTab('pricing');
                    if (onClose && window.innerWidth < 768) onClose(); // Close on navigate
                  }
                } else if (user.role === UserRole.PRO) {
                  // Logic for PRO accessing forbidden tools
                  window.alert("Esta función es exclusiva para usuarios PRO Master.");
                }
                return;
              }

              handleMobileItemClick(item.id);
            };

            return (
              <button
                key={item.id}
                onClick={handleItemClick}
                className={`w-full flex items-center justify-between p-4 rounded-xl mb-2 transition-all duration-300 group relative ${activeTab === item.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                  : isLocked
                    ? 'text-slate-600 cursor-not-allowed opacity-50 bg-slate-800/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === item.id ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'
                    }`}>
                    <i className={`fas ${item.icon} ${activeTab === item.id ? 'text-white' : 'text-emerald-500'}`}></i>
                  </div>
                  <span className={`font-medium ${activeTab === item.id ? 'font-bold' : ''}`}>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-red-500/50 shadow-lg">
                    {item.badge}
                  </span>
                )}
                {isLocked && (
                  <i className="fas fa-lock text-slate-500 absolute right-4"></i>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-slate-800/30 mb-4 border border-slate-700/30">
            <div className="relative">
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=10b981&color=fff`}
                className="w-10 h-10 rounded-xl border-2 border-slate-700 shadow-inner object-cover"
                alt="Avatar"
              />
              {/* Status Indicator */}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${isInactive ? 'bg-red-500' : 'bg-emerald-500'}`}>
                {isInactive ? <i className="fas fa-times text-[6px] text-white"></i> : <i className="fas fa-check text-[6px] text-white"></i>}
              </div>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isAdmin ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                {user.role === UserRole.SUPERADMIN ? 'SuperAdmin' : user.role === UserRole.COACH ? 'Coach' : user.role === UserRole.ADMIN ? 'Admin' : user.role}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            data-action="logout"
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20 font-bold text-sm"
          >
            <i className="fas fa-power-off w-5 text-center"></i>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
