import React, { useState, useEffect } from 'react';
import { User, UserRole, CommunityPost } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

import Community from './Community';
import { authService, userService } from '../services/api';
import SubscriptionValidation from './SubscriptionValidation';

interface AdminPanelProps {
  view: 'dashboard' | 'community' | 'users' | 'stats' | 'subscriptions';
  currentUser: User; // Need to know WHO is viewing
  communityPosts: CommunityPost[];
  onSendMessage: (userId: string, text: string) => void;
  onPostAction: (postId: string, action: 'approve' | 'reject' | 'edit', feedback?: string) => void;
  onModeratePost?: (id: string) => void; // Legacy
  onShare?: (content: string, type: CommunityPost['type']) => void;
  onEarnTokens?: (amount: number) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ view, currentUser, communityPosts, onSendMessage, onPostAction, onShare, onEarnTokens }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingCoachId, setViewingCoachId] = useState<string | null>(null); // For SuperAdmin drill-down

  // Helper to determine if user has SuperAdmin privileges (supports legacy 'admin' role)
  const isSuperAdmin = currentUser.role === UserRole.SUPERADMIN || currentUser.role === UserRole.ADMIN;

  /* New State for User Management */
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [successPopup, setSuccessPopup] = useState<{ show: boolean; title: string, message: string } | null>(null);
  const [accountType, setAccountType] = useState<'client' | 'coach'>('client'); // Explicit UI state
  const [communityTab, setCommunityTab] = useState<'moderation' | 'feed'>('moderation');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.FREE,
    coachTier: 'standard' as 'standard' | 'vip' // New state for coach creation
  });

  // Initialize users as empty array (rely on API)
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  /* Token Management State */
  const [tokenTool, setTokenTool] = useState({
    coachId: '',
    recipientType: 'coach' as 'coach' | 'client',
    clientId: '',
    amount: 0,
    reason: ''
  });
  const [showTokenTool, setShowTokenTool] = useState(false);

  /* Search State */
  const [coachSearchTerm, setCoachSearchTerm] = useState('');

  // New state for UX feedback
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);

  // Calculate filtered lists for Token Tool
  const coachesList = users
    .filter(u => u.role === UserRole.COACH)
    .filter(c => c.name.toLowerCase().includes(coachSearchTerm.toLowerCase()) || c.email.toLowerCase().includes(coachSearchTerm.toLowerCase()));



  const clientsList = users.filter(u => {
    // Relaxed logic: If the user has this coachId, they show up.
    // We exclude the coach themselves just in case.
    const matchesCoach = String(u.coachId) === String(tokenTool.coachId);
    const isNotSelf = u.id !== tokenTool.coachId; // Prevent self-match if data is weird

    // Detailed Debugging (Keep for now)
    if (tokenTool.coachId && matchesCoach) {
      console.log(`Debug Client Found: ${u.name} (${u.role}) - CoachID Matches`);
    }

    return matchesCoach && isNotSelf;
  });

  const handleAddTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenTool.amount || tokenTool.amount <= 0) return alert("Ingrese una cantidad válida");

    // Determine Target ID
    const targetId = tokenTool.recipientType === 'coach' ? tokenTool.coachId : tokenTool.clientId;
    if (!targetId) return alert("Seleccione un usuario destinatario");

    if (!window.confirm(`¿Confirmar carga de ${tokenTool.amount} tokens al usuario?`)) return;

    try {
      await userService.addTokens(targetId, Number(tokenTool.amount), tokenTool.reason);
      setSuccessPopup({ show: true, title: "Tokens Agregados", message: `Se cargaron ${tokenTool.amount} tokens exitosamente.` });
      // Reset Logic
      setTokenTool(prev => ({ ...prev, amount: 0, reason: '' }));

      // Refresh Users to see new balance
      // Trigger a re-fetch if possible or just update local state manually? 
      // For simple Admin Panel, window.location.reload() or re-trigger effect is easiest but harsh. 
      // Let's rely on success popup for now.
    } catch (error: any) {
      console.error("Token Error:", error);
      const errorMsg = error.response?.data?.message || error.message || "Error desconocido";
      alert(`Error al cargar tokens: ${errorMsg}`);
    }
  };

  /* Render Token Management Section */
  const renderTokenManagement = () => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-fade-in-up">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <i className="fas fa-coins text-amber-500"></i>
        Gestión de Tokens y Reparaciones
      </h3>

      <form onSubmit={handleAddTokens} className="space-y-6 max-w-2xl bg-slate-50 p-6 rounded-2xl border border-slate-200">
        {/* 1. Select Coach */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">1. Seleccionar Coach (Partner)</label>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Buscar coach por nombre o email..."
            className="w-full p-2 mb-2 rounded-lg border border-slate-300 text-sm"
            value={coachSearchTerm}
            onChange={e => setCoachSearchTerm(e.target.value)}
          />

          <select
            className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
            value={tokenTool.coachId}
            onChange={e => setTokenTool({ ...tokenTool, coachId: e.target.value, clientId: '', recipientType: 'coach' })}
          >
            <option value="">-- Seleccione un Coach --</option>
            {coachesList.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
            ))}
          </select>
        </div>

        {/* 2. Recipient Type */}
        {tokenTool.coachId && (
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer p-3 bg-white rounded-xl border border-slate-200 flex-1 hover:border-emerald-500 transition">
              <input
                type="radio"
                name="recipient"
                checked={tokenTool.recipientType === 'coach'}
                onChange={() => setTokenTool({ ...tokenTool, recipientType: 'coach' })}
                className="text-emerald-500 focus:ring-emerald-500"
              />
              <span className="font-bold text-slate-700">Entregar al Coach</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 bg-white rounded-xl border border-slate-200 flex-1 hover:border-emerald-500 transition">
              <input
                type="radio"
                name="recipient"
                checked={tokenTool.recipientType === 'client'}
                onChange={() => setTokenTool({ ...tokenTool, recipientType: 'client' })}
                className="text-emerald-500 focus:ring-emerald-500"
              />
              <span className="font-bold text-slate-700">Entregar a un Alumno</span>
            </label>
          </div>
        )}

        {/* 3. Select Client (Dropdown Restored) */}
        {tokenTool.recipientType === 'client' && tokenTool.coachId && (
          <div className="animate-fade-in">
            <label className="block text-sm font-bold text-slate-700 mb-2">2. Seleccionar Alumno</label>
            <select
              className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
              value={tokenTool.clientId}
              onChange={e => setTokenTool({ ...tokenTool, clientId: e.target.value })}
              required={tokenTool.recipientType === 'client'}
            >
              <option value="">-- Seleccione un Alumno del Coach --</option>
              {clientsList.length === 0 ? (
                <option disabled>No se encontraron alumnos para este coach</option>
              ) : (
                clientsList.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.surname} ({c.email}) - {c.tokens} Tk</option>
                ))
              )}
            </select>
          </div>
        )}

        {/* 4. Amount & Reason */}
        {tokenTool.coachId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Cantidad de Tokens</label>
              <input
                type="number"
                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej: 500"
                value={tokenTool.amount || ''}
                onChange={e => setTokenTool({ ...tokenTool, amount: Number(e.target.value) })}
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Motivo (Opcional)</label>
              <input
                type="text"
                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej: Reembolso por error de servidor"
                value={tokenTool.reason}
                onChange={e => setTokenTool({ ...tokenTool, reason: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        {tokenTool.coachId && (
          <button
            type="submit"
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:scale-[1.02]"
          >
            <i className="fas fa-paper-plane mr-2"></i>
            Enviar Tokens
          </button>
        )}

      </form>
    </div>
  );

  // API Fetch for active real data
  useEffect(() => {
    const fetchRealUsers = async () => {
      setLoading(true);
      if (currentUser.role === UserRole.COACH) {
        try {
          const clients = await userService.getCoachClients(currentUser.id);
          if (Array.isArray(clients)) {
            setUsers(clients);
          }
        } catch (error) {
          console.error("AdminPanel: Failed to fetch clients", error);
        }
      }

      // If Admin, fetch ALL users
      if (isSuperAdmin) {
        try {
          const allUsers = await userService.getAllUsers();
          if (Array.isArray(allUsers)) {
            setUsers(allUsers);
          }
        } catch (error) {
          console.error("AdminPanel: Failed to fetch all users", error);
        }
      }
      setLoading(false);
    };
    fetchRealUsers();
  }, [currentUser.role, currentUser.id]);

  // Filter users based on Multi-tenancy
  // Filter users based on Multi-tenancy
  const displayedUsers = users.filter(u => {
    if (isSuperAdmin) {
      if (viewingCoachId) {
        // If we are drilling down, show clients of that coach
        return u.coachId === viewingCoachId;
      }
      // Otherwise, show only COACHES
      return u.role === UserRole.COACH;
    }
    if (currentUser.role === UserRole.COACH) return u.coachId === currentUser.id; // Coach sees their own
    return false;
  });



  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    // Logic for Coach: Cannot assign PRO/MASTER directly, must request approval
    if (currentUser.role === UserRole.COACH && (newRole === UserRole.PRO || newRole === UserRole.PRO_MASTER)) {
      if (window.confirm(`Como Coach, la asignación del plan ${newRole} requiere validación por administración. ¿Solicitar cambio?`)) {
        try {
          // Send pendingPlan instead of role
          await userService.updateProfile(userId, { pendingPlan: newRole === UserRole.PRO ? 'pro' : 'pro_master' });

          // Optimistic update (show as pending in UI if we had a visual indicator, or just alert)
          setSuccessPopup({
            show: true,
            title: 'Solicitud Enviada',
            message: `Se ha solicitado el plan ${newRole}. El administrador validará el pago y activará el servicio.`
          });

          // Optionally update local state to reflect pending status if we track it
          const updatedUsers = users.map(u => u.id === userId ? { ...u, pendingPlan: newRole === UserRole.PRO ? 'pro' : 'pro_master' } : u);
          setUsers(updatedUsers);
          if (selectedUser && selectedUser.id === userId) {
            setSelectedUser({ ...selectedUser, pendingPlan: newRole === UserRole.PRO ? 'pro' : 'pro_master' });
          }

        } catch (error) {
          console.error("Error requesting plan change:", error);
          alert('Error al solicitar cambio de plan.');
        }
      }
      return;
    }

    // Default Admin Logic (Direct Update)
    if (window.confirm(`¿Estás seguro de cambiar el rol a ${newRole}?`)) {
      try {
        await userService.updateProfile(userId, { role: newRole });
        const updatedUsers = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
        setUsers(updatedUsers);
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({ ...selectedUser, role: newRole });
        }
        alert('Rol actualizado y sincronizado.');
      } catch (error) {
        console.error("Error updating role:", error);
        alert('Error al actualizar el rol en la base de datos.');
      }
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    const action = newStatus === 'active' ? 'activar' : 'desactivar';

    if (window.confirm(`¿Estás seguro de ${action} a ${user.name}?`)) {
      try {
        await userService.updateStatus(user.id, newStatus);
        const updatedUsers = users.map(u => u.id === user.id ? { ...u, status: newStatus } : u);
        setUsers(updatedUsers);
        if (selectedUser && selectedUser.id === user.id) {
          setSelectedUser({ ...selectedUser, status: newStatus });
        }
        // Optional: Toast notification instead of alert
      } catch (error) {
        console.error("Error toggling status:", error);
        alert('Error al cambiar el estado.');
      }
    }
  };



  const handleBulkToggle = async (status: 'active' | 'inactive') => {
    if (window.confirm(`¿Seguro que deseas marcar como ${status} a TODOS tus alumnos?`)) {
      try {
        await userService.bulkUpdateStatus(currentUser.id, status);
        // Refresh users
        const updatedUsers = users.map(u => u.coachId === currentUser.id ? { ...u, status } : u);
        setUsers(updatedUsers);
        alert(`Todos los alumnos han sido marcados como ${status}`);
      } catch (error) {
        console.error("Bulk toggle error", error);
        alert("Error al actualizar estados masivamente");
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      try {
        await userService.deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
        if (selectedUser && selectedUser.id === userId) setSelectedUser(null);
        alert('Usuario eliminado permanentemente.');
      } catch (error) {
        console.error("Error deleting user:", error);
        alert('Error al eliminar usuario en la base de datos.');
      }
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return alert('Por favor completa nombre, email y contraseña');

    // Determine final role
    const finalRole = accountType === 'coach' ? UserRole.COACH : newUser.role;

    // For Coaches: If selecting PRO/MASTER, force FREE and set pending flag
    let actualRole = finalRole;
    let pendingPlan: User['pendingPlan'] = undefined;

    if (currentUser.role === UserRole.COACH && (finalRole === UserRole.PRO || finalRole === UserRole.PRO_MASTER)) {
      actualRole = UserRole.FREE;
      pendingPlan = finalRole as 'pro' | 'pro_master';
    }

    const userPayload = {
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: actualRole,
      planType: actualRole === UserRole.COACH ? 'coach_trial' : (actualRole === UserRole.FREE ? 'free' : actualRole === UserRole.PRO ? 'pro' : 'pro_master'),
      // If Admin is creating a client, coachId is NULL (unless we select one). 
      // If Coach is creating a client, coachId is currentUser.id.
      // If Admin is creating a Coach, coachId is NULL.
      coachId: currentUser.role === UserRole.COACH ? currentUser.id : undefined,
      // For Coaches: Send tier
      coachTier: finalRole === UserRole.COACH ? newUser.coachTier as 'vip' | 'vip_plus' : undefined,
      pendingPlan // Flag for validation
    };

    try {
      const response = await authService.register(userPayload, false); // false = DO NOT AUTO LOGIN
      const createdUser = response.user;

      // Update local list (optional, if we want to see it immediately without fetching)
      setUsers([...users, createdUser]);
      setIsUserModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: UserRole.FREE, coachTier: 'vip' });
      setAccountType('client'); // Reset UI state

      // Modern Success Popup
      let successMsg = `Usuario ${createdUser.name} creado correctamente.`;
      if (createdUser.role === UserRole.COACH) {
        successMsg = `Coach ${createdUser.name} creado con éxito!`;
      } else if (pendingPlan) {
        successMsg = `Usuario creado. Plan ${pendingPlan.toUpperCase()} pendiente de validación por Administración.`;
      }

      setSuccessPopup({
        show: true,
        title: pendingPlan ? 'En Espera de Validación' : '¡Operación Exitosa!',
        message: successMsg
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(`Error al crear usuario: ${error.response?.data?.message || error.message} `);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser(prev => ({ ...prev, password: pass }));
  };

  const goalTranslations: Record<string, string> = {
    'weight_loss': 'Pérdida de Peso',
    'muscle_gain': 'Ganancia Muscular',
    'maintenance': 'Mantenimiento',
    'endurance': 'Resistencia'
  };

  const mockStats = [
    { name: 'Ene', income: 4000, users: 24 },
    { name: 'Feb', income: 3000, users: 18 },
    { name: 'Mar', income: 5000, users: 35 },
    { name: 'Abr', income: 2780, users: 15 },
    { name: 'May', income: 1890, users: 40 },
    { name: 'Jun', income: 2390, users: 30 },
  ];

  // Fetch community stats
  const [communityStats, setCommunityStats] = useState<{ avgStreak: number, totalPosts: number } | undefined>(undefined);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<{
    incomeData: any[],
    userData: any[],
    coachData: any[],
    tokenData: any[],
    globalStats?: { totalUsers: number, userGrowth: number, mrr: number, totalTokens: number },
    alerts?: any[]
  } | null>(null);

  useEffect(() => {
    const fetchCommunityStats = async () => {
      try {
        const data = await userService.getCommunityStats();
        setCommunityStats(data.stats);
        setLeaderboard(data.leaderboard);
      } catch (error) {
        console.error("Failed to load community stats");
      }
    };
    if (view === 'community') fetchCommunityStats();

    const fetchAdminStats = async () => {
      try {
        const data = await userService.getSuperAdminAnalytics();
        setAdminStats(data);
      } catch (error) {
        console.error("Failed to fetch admin analytics");
      }
    };
    if (view === 'stats' || view === 'dashboard') fetchAdminStats();

  }, [view]);

  if (view === 'community') {
    // Separate pending from published/others for clarity? 
    // User wants moderation UI, so we should focus on Pending posts.
    const pendingPosts = communityPosts.filter(p => p.status === 'pending');
    const historyPosts = communityPosts.filter(p => p.status !== 'pending');

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-slate-900">
            {communityTab === 'moderation' ? 'Moderación de Comunidad' : 'Feed Comunidad'}
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setCommunityTab('moderation')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${communityTab === 'moderation' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'} `}
            >
              Moderación
            </button>
            <button
              onClick={() => setCommunityTab('feed')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${communityTab === 'feed' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'} `}
            >
              Ver Feed
            </button>
          </div>
        </div>

        {communityTab === 'feed' ? (
          onShare && onEarnTokens ? (
            <div className="-m-10">
              <Community
                posts={communityPosts}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                currentUserAvatar={currentUser.avatar}
                onShare={onShare}
                onEarnTokens={onEarnTokens}
                // Pass moderation handlers down
                onApprove={(postId) => onPostAction(postId, 'approve')}
                onReject={(postId) => onPostAction(postId, 'reject')}
                onLike={(postId) => { /* Like handler if available in AdminPanel props? defaulting to console */ console.log("Like", postId) }}
                onComment={(postId, text) => { /* Comment handler if available? */ console.log("Comment", postId, text) }}
                isModerator={true}
                stats={communityStats}
                leaderboard={leaderboard}
              />
            </div>
          ) : (
            <div className="text-center p-10 text-slate-400">Error: Missing props for Feed View</div>
          )
        ) : (
          <>

            {pendingPosts.length > 0 && (
              <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 mb-8">
                <h3 className="font-bold text-amber-800 mb-4 text-lg">⚠️ Publicaciones Pendientes ({pendingPosts.length})</h3>
                <div className="grid grid-cols-1 gap-4">
                  {pendingPosts.map(post => {
                    // Quick Parse for Food Analysis to make it compact
                    const isFoodAnalysis = post.content.includes("análisis de comida");
                    let displayContent = post.content;
                    let displayTitle = post.userName;

                    if (isFoodAnalysis) {
                      // Try to extract useful bits
                      const parts = post.content.split('💡');
                      const stats = parts[0].split('📊')[2] || parts[0]; // "1400 kcal..."
                      const summary = parts[1] ? parts[1].substring(0, 100) + "..." : "";

                      displayContent = (
                        <div className="text-sm">
                          <div className="font-bold text-emerald-600 mb-1">{stats.replace('Mi análisis de comida:', '').trim()}</div>
                          <p className="text-slate-500 leading-tight">{summary || post.content.substring(0, 100)}</p>
                        </div>
                      );
                    } else {
                      // Standard truncation
                      displayContent = <p className="text-slate-600 italic">"{post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content}"</p>;
                    }

                    return (
                      <div key={post.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        {/* Compact Content */}
                        <div className="flex-1 flex gap-4 items-center">
                          {post.imageUrl && (
                            <img src={post.imageUrl} className="w-16 h-16 rounded-xl object-cover border border-slate-200" alt="Plato" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-800 text-sm">{post.userName}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">{post.type}</span>
                            </div>
                            {displayContent}
                            <p className="text-[10px] text-slate-300 mt-1">{new Date(post.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>

                        {/* Compact Actions */}
                        {/* Compact Actions with Loading State */}
                        <div className="flex items-center gap-2">
                          {processingPostId === post.id ? (
                            <span className="text-slate-500 text-sm font-bold animate-pulse flex items-center bg-slate-100 px-3 py-1 rounded-lg">
                              <i className="fas fa-spinner fa-spin mr-2"></i> Procesando...
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProcessingPostId(post.id);
                                  onPostAction(post.id, 'approve');
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition transform hover:scale-105"
                                title="Aprobar"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const feedback = prompt("Indica qué debe corregir el usuario:");
                                  if (feedback) {
                                    setProcessingPostId(post.id);
                                    onPostAction(post.id, 'edit', feedback);
                                  }
                                }}
                                className="bg-amber-400 hover:bg-amber-500 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition transform hover:scale-105"
                                title="Corregir"
                              >
                                <i className="fas fa-pen"></i>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("¿Rechazar publicación?")) {
                                    setProcessingPostId(post.id);
                                    onPostAction(post.id, 'reject');
                                  }
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition transform hover:scale-105"
                                title="Rechazar"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Contenido</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historyPosts.map(post => (
                    <tr key={post.id} className={post.status === 'rejected' ? 'opacity-50 bg-slate-50' : ''}>
                      <td className="px-6 py-4 font-bold text-slate-700">{post.userName}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(post.timestamp).toLocaleDateString()} <br />
                        {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${post.status === 'published' ? 'bg-emerald-100 text-emerald-600' :
                          post.status === 'rejected' ? 'bg-red-100 text-red-600' :
                            post.status === 'needs_edit' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {post.status || 'Publicado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 italic truncate max-w-xs">"{post.content}"</td>
                      <td className="px-6 py-4">
                        <button onClick={() => onPostAction(post.id, 'reject')} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase">Borrar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );

  }

  if (view === 'subscriptions') {
    return <SubscriptionValidation />;
  }

  if (view === 'users') {
    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Toggle: User List vs Create User Form */}
        {/* Toggle: User List vs Create User Form vs Client Profile */}
        {!isUserModalOpen && !selectedUser && (
          <>
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-slate-900">
                  {currentUser.role === UserRole.COACH ? 'Mis Alumnos' : viewingCoachId ? 'Clientes del Coach' : 'Directorio de Coaches'}
                </h2>
                <p className="text-slate-400 text-sm font-bold mt-1">
                  {displayedUsers.length} {viewingCoachId || currentUser.role === UserRole.COACH ? 'Clientes asignados' : 'Partners registrados'}
                </p>
              </div>
              <div className="flex gap-4">
                {viewingCoachId && (
                  <button
                    onClick={() => setViewingCoachId(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2"
                  >
                    <i className="fas fa-arrow-left"></i> Volver
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsUserModalOpen(true);
                    // SuperAdmin defaults to creating Coach, Coach defaults to creating Client
                    setAccountType(isSuperAdmin ? 'coach' : 'client');
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <i className="fas fa-plus"></i> Crear Nuevo {isSuperAdmin ? 'Coach' : 'Usuario'}
                </button>
                <div className="flex bg-slate-100 rounded-xl p-1 items-center gap-2">
                  {currentUser.role === UserRole.COACH && (
                    <div className="flex items-center gap-1 px-2 border-r border-slate-200">
                      <button
                        onClick={() => handleBulkToggle('active')}
                        className="text-[10px] font-bold bg-white text-emerald-600 px-2 py-1 rounded shadow-sm hover:bg-emerald-50 transition"
                        title="Activar Todos"
                      >
                        <i className="fas fa-check-double"></i> Todo ON
                      </button>
                      <button
                        onClick={() => handleBulkToggle('inactive')}
                        className="text-[10px] font-bold bg-white text-red-500 px-2 py-1 rounded shadow-sm hover:bg-red-50 transition"
                        title="Desactivar Todos"
                      >
                        <i className="fas fa-ban"></i> Todo OFF
                      </button>
                    </div>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => setShowTokenTool(!showTokenTool)}
                      className={`p-2 rounded-lg transition ${showTokenTool ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-amber-500'}`}
                      title="Gestión de Tokens"
                    >
                      <i className="fas fa-coins"></i>
                    </button>
                  )}
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <i className="fas fa-th-large"></i>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <i className="fas fa-list"></i>
                  </button>
                </div>
              </div>
            </header>

            {/* Token Management Tool */}
            {showTokenTool && isSuperAdmin && (
              <div className="mb-8">
                {renderTokenManagement()}
              </div>
            )}

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedUsers.map(u => (
                  <div key={u.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-emerald-500 transition-all relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                    <div className="mb-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600">
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <h3 className="font-black text-slate-800 text-lg leading-tight">{u.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{u.role}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleStatus(u); }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition flex items-center gap-1 border ${u.status === 'inactive' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                            >
                              <i className={`fas fa-${u.status === 'inactive' ? 'ban' : 'check-circle'}`}></i>
                              {u.status === 'inactive' ? 'Inacto' : 'Activo'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-slate-400 text-xs flex items-center gap-2"><i className="fas fa-envelope w-4"></i> {u.email}</p>
                        <p className="text-slate-400 text-xs flex items-center gap-2"><i className="fas fa-coins w-4 text-emerald-500"></i> <span className="text-emerald-600 font-bold">{u.tokens} tokens</span></p>
                      </div>
                    </div>
                    {u.role === UserRole.COACH && isSuperAdmin ? (
                      <button
                        onClick={() => setViewingCoachId(u.id)}
                        className="w-full bg-slate-900 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-slate-900/20"
                      >
                        Ver Clientes <i className="fas fa-arrow-right ml-1"></i>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="w-full bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 py-3 rounded-xl font-bold text-sm transition"
                      >
                        Ver Ficha
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4">Tokens</th>
                      <th className="px-6 py-4">Última Vez</th>
                      <th className="px-6 py-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayedUsers.map(u => {
                      // CRM SEMAPHORE LOGIC
                      // Green: Active & Tokens > 10
                      // Yellow: Inactive > 3 days (not implemented strictly yet, using mocked logic or status)
                      // Red: Expired or Tokens < 10
                      let statusColor = 'bg-emerald-100 text-emerald-600';
                      let statusIcon = 'check-circle';
                      let statusText = 'Excelente';

                      // Determine Color
                      if (u.tokens < 10 || u.status === 'inactive') {
                        statusColor = 'bg-red-100 text-red-600';
                        statusIcon = 'exclamation-circle';
                        statusText = 'Riesgo';
                      } else if (u.tokens < 50) {
                        statusColor = 'bg-amber-100 text-amber-600';
                        statusIcon = 'clock';
                        statusText = 'Atención';
                      }

                      return (
                        <tr key={u.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 text-sm">{u.name}</p>
                                <p className="text-xs text-slate-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-black uppercase">{u.role}</span>
                          </td>
                          <td className="px-6 py-4">
                            {/* CRM Visual Indicator */}
                            <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${statusColor}`}>
                              <i className={`fas fa-${statusIcon}`}></i>
                              {statusText}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">{u.tokens}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-medium">{u.lastLogin || 'N/A'}</td>
                          <td className="px-6 py-4 flex gap-2">
                            <button onClick={() => setSelectedUser(u)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase">Ver</button>
                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 font-bold text-xs uppercase">Borrar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Create User Form View (Full Page) */}
        {isUserModalOpen && (
          <div className="animate-fadeIn">
            {/* Header for Create View */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-xl transition"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h3 className="text-2xl font-black text-slate-900">
                {accountType === 'coach' ? 'Registrar Nuevo Coach' : 'Registrar Nuevo Usuario'}
              </h3>
            </div>

            {/* Create User Form - Full Page Card */}
            <div className="bg-white w-full max-w-2xl mx-auto rounded-[2rem] p-8 md:p-12 shadow-xl border border-slate-100">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nombre Completo</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full bg-slate-50 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full bg-slate-50 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Contraseña Temporal</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUser.password}
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full bg-slate-50 rounded-xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      placeholder="Ej. 123456"
                    />
                    <button
                      onClick={generatePassword}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-6 rounded-xl font-bold transition"
                      title="Generar contraseña"
                    >
                      <i className="fas fa-magic"></i>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-4 block">Configuración de Cuenta</label>

                  {/* Optional: Show read-only badge? */}
                  {isSuperAdmin && (
                    <div className="bg-slate-50 p-3 rounded-xl mb-6 text-center border border-slate-100">
                      <span className="text-xs font-bold text-slate-500 uppercase">Creando cuenta de: <span className="text-slate-900 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded ml-1">{isSuperAdmin && accountType === 'coach' ? 'Coach Partner' : 'Cliente Final'}</span></span>
                    </div>
                  )}

                  {accountType === 'coach' ? (
                    <div className="animate-fadeIn bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                      <label className="text-xs font-bold text-emerald-800 uppercase mb-4 block flex items-center gap-2">
                        <i className="fas fa-percentage"></i> Nivel de Partner
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          onClick={() => setNewUser(prev => ({ ...prev, coachTier: 'vip' }))}
                          className={`p-4 rounded-xl text-sm font-bold uppercase transition flex flex-col items-center gap-2 ${newUser.coachTier === 'vip' ? 'bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-500 ring-offset-2' : 'bg-white text-slate-400 hover:bg-emerald-50 border border-emerald-100'}`}
                        >
                          <span>Coach VIP</span>
                          <span className={`text-[10px] px-3 py-1 rounded-full ${newUser.coachTier === 'vip' ? 'bg-emerald-700 text-white' : 'bg-slate-100'}`}>1000 Tokens</span>
                        </button>
                        <button
                          onClick={() => setNewUser(prev => ({ ...prev, coachTier: 'vip_plus' }))}
                          className={`p-4 rounded-xl text-sm font-bold uppercase transition flex flex-col items-center gap-2 ${newUser.coachTier === 'vip_plus' ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-600 ring-offset-2' : 'bg-white text-slate-400 hover:bg-purple-50 border border-purple-100'}`}
                        >
                          <span>Coach VIP Plus</span>
                          <span className={`text-[10px] px-3 py-1 rounded-full ${newUser.coachTier === 'vip_plus' ? 'bg-purple-800 text-white' : 'bg-slate-100'}`}>2000 Tokens</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-fadeIn">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Plan del Cliente</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[UserRole.FREE, UserRole.PRO, UserRole.PRO_MASTER].map(role => (
                          <button
                            key={role}
                            onClick={() => setNewUser(prev => ({ ...prev, role }))}
                            className={`p-4 rounded-xl text-xs font-bold uppercase transition flex flex-col items-center justify-center gap-2 h-24 ${newUser.role === role ? 'bg-slate-900 text-white shadow-lg ring-2 ring-slate-900 ring-offset-2' : 'bg-slate-50 text-slate-400 hover:bg-slate-200'}`}
                          >
                            <span>{role}</span>
                            <span className="text-[10px] opacity-60">
                              {role === UserRole.FREE ? '100 T' : role === UserRole.PRO ? '750 T' : '1500 T'}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-emerald-600 font-bold mt-4 text-center bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <i className="fas fa-check-circle mr-1"></i>
                        {newUser.role === UserRole.FREE ? '100 Tokens' : newUser.role === UserRole.PRO ? '750 Tokens' : '1500 Tokens'} incluidos mensualmente
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-10 pt-6 border-t border-slate-100">
                <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition">
                  Cancelar
                </button>
                <button onClick={handleAddUser} className="flex-1 py-4 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition transform hover:scale-[1.02]">
                  <i className="fas fa-plus mr-2"></i> Crear Usuario
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Client Profile View (Full Page) */}
        {selectedUser && (
          <div className="animate-fadeIn">
            {/* Header for Profile View */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-xl transition"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h3 className="text-2xl font-black text-slate-900">
                Ficha del Usuario
              </h3>
            </div>

            <div className="bg-white w-full max-w-4xl mx-auto rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 flex flex-col">

              {/* Profile Header */}
              <div className="bg-slate-900 p-8 md:p-12 text-white relative">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-emerald-500 rounded-3xl flex items-center justify-center text-4xl md:text-5xl font-bold shadow-2xl shadow-emerald-500/30 ring-4 ring-slate-800">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-3xl md:text-4xl font-black mb-2">{selectedUser.name}</h3>
                    <div className="flex flex-col md:flex-row items-center gap-3 text-slate-400 text-sm">
                      <span className="flex items-center gap-2">
                        <i className="fas fa-envelope"></i> {selectedUser.email}
                      </span>
                      <span className="hidden md:inline w-1 h-1 bg-slate-600 rounded-full"></span>
                      <span className="flex items-center gap-2 font-mono bg-slate-800 px-3 py-1 rounded-lg text-emerald-400 border border-slate-700">
                        <i className="fas fa-key text-xs"></i> {selectedUser.password}
                      </span>
                      <span className="hidden md:inline w-1 h-1 bg-slate-600 rounded-full"></span>

                      {/* Role Selector */}
                      <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                        <i className="fas fa-crown text-amber-400 ml-2 text-xs"></i>
                        <select
                          value={selectedUser.role}
                          onChange={(e) => handleUpdateRole(selectedUser.id, e.target.value as UserRole)}
                          className="bg-transparent text-slate-200 text-xs font-bold uppercase tracking-wider outline-none border-none cursor-pointer hover:text-white transition py-1 pr-2"
                        >
                          <option value={UserRole.FREE} className="bg-slate-900">FREE</option>
                          <option value={UserRole.PRO} className="bg-slate-900">PRO</option>
                          <option value={UserRole.PRO_MASTER} className="bg-slate-900">PRO MASTER</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 md:p-12 bg-slate-50/50">

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center hover:border-emerald-200 transition">
                    <div className="w-10 h-10 bg-emerald-100/50 text-emerald-600 rounded-full flex items-center justify-center mb-3 text-lg">
                      <i className="fas fa-coins"></i>
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Tokens Saldo</p>
                    <p className="text-3xl font-black text-slate-800">{selectedUser.tokens}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 bg-slate-50 px-2 py-0.5 rounded-full">Total: {selectedUser.lifetimeTokens || selectedUser.tokens}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center hover:border-blue-200 transition">
                    <div className="w-10 h-10 bg-blue-100/50 text-blue-600 rounded-full flex items-center justify-center mb-3 text-lg">
                      <i className="fas fa-clock"></i>
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Última Vez</p>
                    <p className="text-lg font-bold text-slate-800">{selectedUser.lastLogin || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center hover:border-purple-200 transition">
                    <div className="w-10 h-10 bg-purple-100/50 text-purple-600 rounded-full flex items-center justify-center mb-3 text-lg">
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Miembro Desde</p>
                    <p className="text-lg font-bold text-slate-800">{selectedUser.joinedAt}</p>
                  </div>
                </div>

                {/* COACH SPECIFIC: CLIENT LIST */}
                {selectedUser.role === UserRole.COACH && (
                  <div className="mb-10 animate-fadeIn">
                    <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-3 text-xl">
                      <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-sm">
                        <i className="fas fa-users"></i>
                      </span>
                      Alumnos Asignados
                      <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                        {users.filter(u => u.coachId === selectedUser.id).length}
                      </span>
                    </h4>

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                      {users.filter(u => u.coachId === selectedUser.id).length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {users.filter(u => u.coachId === selectedUser.id).map(client => (
                            <div key={client.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                                  {client.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">{client.name}</p>
                                  <p className="text-xs text-slate-500">{client.email}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedUser(client)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                              >
                                Ver Ficha
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400">
                          <i className="fas fa-user-slash text-2xl mb-2 opacity-50"></i>
                          <p className="text-sm">Este coach no tiene alumnos asignados aún.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Biometrics */}
                <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-3 text-xl">
                  <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-sm">
                    <i className="fas fa-ruler-combined"></i>
                  </span>
                  Datos Físicos
                </h4>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm mb-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-2">Peso Actual</p>
                      <p className="text-2xl font-black text-slate-800">{selectedUser.biometrics?.weight || '-'} <span className="text-sm text-slate-400 font-bold">kg</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-2">Altura</p>
                      <p className="text-2xl font-black text-slate-800">{selectedUser.biometrics?.height || '-'} <span className="text-sm text-slate-400 font-bold">cm</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-2">Edad</p>
                      <p className="text-2xl font-black text-slate-800">{selectedUser.biometrics?.age || '-'} <span className="text-sm text-slate-400 font-bold">años</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-2">Meta Principal</p>
                      <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-slate-900/20">
                        {(selectedUser.biometrics?.goal && goalTranslations[selectedUser.biometrics.goal]) || selectedUser.biometrics?.goal || 'No definido'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical & Habits (New) */}
              <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-3 text-xl">
                <span className="w-8 h-8 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-sm">
                  <i className="fas fa-heartbeat"></i>
                </span>
                Salud y Hábitos
              </h4>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm mb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">Patologías</p>
                    <p className="font-medium text-slate-800">
                      {selectedUser.biometrics?.medicalConditions || (selectedUser.biometrics as any)?.medical_conditions || 'Ninguna'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">Alergias</p>
                    <p className="font-medium text-slate-800">
                      {selectedUser.biometrics?.allergies && selectedUser.biometrics.allergies.length ? selectedUser.biometrics.allergies : 'Ninguna'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">Medicamentos</p>
                    <p className="font-medium text-slate-800">
                      {selectedUser.biometrics?.medications || 'Ninguno'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">Lesiones</p>
                    <p className="font-medium text-slate-800">
                      {selectedUser.biometrics?.injuries || 'Ninguna'}
                    </p>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-bold uppercase">Sueño</p>
                      <p className="font-bold text-slate-800">{selectedUser.biometrics?.sleepHours || (selectedUser.biometrics as any)?.sleep_hours || '-'} h</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-bold uppercase">Estrés</p>
                      <p className="font-bold text-slate-800 capitalize">{selectedUser.biometrics?.stressLevel || (selectedUser.biometrics as any)?.stress_level || '-'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-bold uppercase">Agua</p>
                      <p className="font-bold text-slate-800">{selectedUser.biometrics?.waterIntake || (selectedUser.biometrics as any)?.water_intake || '-'} L</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-bold uppercase">Comidas</p>
                      <p className="font-bold text-slate-800">{selectedUser.biometrics?.dailyMeals || (selectedUser.biometrics as any)?.daily_meals || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Send Message Action */}
              <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-3 text-xl">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-sm">
                  <i className="fas fa-paper-plane"></i>
                </span>
                Contactar Cliente
              </h4>
              <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 rounded-2xl p-6 border-none focus:ring-2 focus:ring-blue-500 min-h-[120px] outline-none text-slate-600 font-medium resize-none transition"
                  placeholder={`Escribe un mensaje privado para ${selectedUser.name}...`}
                />
                <div className="flex justify-end p-2 mt-2">
                  <button
                    onClick={() => { onSendMessage(selectedUser.id, message); setMessage(''); alert('Mensaje enviado'); }}
                    className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-sm shadow-xl shadow-slate-900/20 hover:bg-blue-600 hover:shadow-blue-600/30 transition transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!message.trim()}
                  >
                    <i className="fas fa-paper-plane mr-2"></i> Enviar Mensaje
                  </button>
                </div>
              </div>

            </div>
          </div>
        )
        }

        {/* Success Modal */}
        {
          successPopup && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl transform scale-100 transition-all text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm">
                  <i className="fas fa-check"></i>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{successPopup.title}</h3>
                <p className="text-slate-500 font-medium mb-8 text-sm">{successPopup.message}</p>
                <button
                  onClick={() => setSuccessPopup(null)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Aceptar
                </button>
              </div>
            </div>
          )
        }
      </div >
    );
  }

  if (view === 'stats') {
    return (
      <div className="space-y-8 animate-fadeIn">
        <h2 className="text-3xl font-black text-slate-900">Métricas de Rendimiento</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* 1. Ingresos Mensuales */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold mb-6 text-slate-700 flex items-center gap-2">
              <i className="fas fa-dollar-sign text-emerald-500 bg-emerald-100 p-2 rounded-lg"></i>
              Ingresos Reales (Validaciones)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminStats?.incomeData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value) => [`$${value}`, 'Ingresos']} />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {adminStats?.incomeData.length === 0 && <p className="text-center text-xs text-slate-400 mt-2">Sin datos de ingresos recientes</p>}
            </div>
          </div>

          {/* 2. Nuevos Usuarios (Clientes) */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold mb-6 text-slate-700 flex items-center gap-2">
              <i className="fas fa-users text-blue-500 bg-blue-100 p-2 rounded-lg"></i>
              Nuevos Clientes
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adminStats?.userData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Clientes" />
                </LineChart>
              </ResponsiveContainer>
              {adminStats?.userData.length === 0 && <p className="text-center text-xs text-slate-400 mt-2">Sin registros recientes</p>}
            </div>
          </div>

          {/* 3. Nuevos Coaches */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold mb-6 text-slate-700 flex items-center gap-2">
              <i className="fas fa-user-tie text-purple-500 bg-purple-100 p-2 rounded-lg"></i>
              Nuevos Coaches Partners
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminStats?.coachData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="coaches" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Coaches" />
                </BarChart>
              </ResponsiveContainer>
              {adminStats?.coachData.length === 0 && <p className="text-center text-xs text-slate-400 mt-2">Sin registros de coaches recientes</p>}
            </div>
          </div>

          {/* 4. Tokens Consumidos */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold mb-6 text-slate-700 flex items-center gap-2">
              <i className="fas fa-coins text-amber-500 bg-amber-100 p-2 rounded-lg"></i>
              Consumo de Tokens (30 Días)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adminStats?.tokenData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <Tooltip />
                  <Line type="monotone" dataKey="tokens" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} name="Tokens" />
                </LineChart>
              </ResponsiveContainer>
              {adminStats?.tokenData.length === 0 && <p className="text-center text-xs text-slate-400 mt-2">Sin consumo registrado recientemente</p>}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Dashboard (Global) view
  return (
    <div className="space-y-8 animate-fadeIn">
      <h2 className="text-3xl font-black text-slate-900">Gestión Global</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-slate-400 font-bold text-sm uppercase mb-2">Usuarios Totales</p>
            <h3 className="text-5xl font-black">{adminStats?.globalStats?.totalUsers || 0}</h3>
            <span className={`inline-block mt-4 px-3 py-1 rounded-lg text-xs font-bold ${adminStats?.globalStats?.userGrowth >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {adminStats?.globalStats?.userGrowth >= 0 ? '+' : ''}{adminStats?.globalStats?.userGrowth || 0}% este mes
            </span>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] text-slate-800 text-9xl opacity-20 group-hover:scale-110 transition-transform">
            <i className="fas fa-users"></i>
          </div>
        </div>

        <div className="bg-emerald-600 text-white p-8 rounded-[2rem] shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-emerald-100 font-bold text-sm uppercase mb-2">Ingresos Activos</p>
            <h3 className="text-5xl font-black">${adminStats?.globalStats?.mrr?.toLocaleString() || 0}</h3>
            <span className="inline-block mt-4 bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-bold">MRR Actual</span>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] text-emerald-800 text-9xl opacity-20 group-hover:scale-110 transition-transform">
            <i className="fas fa-comments-dollar"></i>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-slate-400 font-bold text-sm uppercase mb-2">Tokens Generados</p>
            <h3 className="text-5xl font-black text-slate-800">
              {adminStats?.globalStats?.totalTokens ? (adminStats.globalStats.totalTokens / 1000).toFixed(1) + 'k' : '0'}
            </h3>
            <span className="inline-block mt-4 bg-orange-100 text-orange-500 px-3 py-1 rounded-lg text-xs font-bold">IA Usage</span>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] text-slate-100 text-9xl group-hover:scale-110 transition-transform">
            <i className="fas fa-brain"></i>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-slate-700 text-xl">Alertas del Sistema</h3>
          <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Ver todas</button>
        </div>
        <div className="space-y-4">
          {(adminStats?.alerts || []).map((alert: any, i: number) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition">
              <div className={`w-3 h-3 rounded-full ${alert.type === 'warning' ? 'bg-amber-500' : alert.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'} `}></div>
              <p className="font-medium text-slate-700 flex-1">{alert.msg}</p>
              <span className="text-xs font-bold text-slate-400 uppercase">{alert.time}</span>
            </div>
          ))}
          {(!adminStats?.alerts || adminStats.alerts.length === 0) && (
            <p className="text-center text-slate-400 text-sm">Sin alertas recientes</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
