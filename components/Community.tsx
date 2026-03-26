import React, { useState, useRef } from 'react';
import { CommunityPost } from '../types';
import HydrationTracker from './HydrationTracker';

interface CommunityProps {
  posts: CommunityPost[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onShare: (content: string, type: CommunityPost['type'], image?: string) => void;
  onEarnTokens: (amount: number) => void;
  onLike?: (postId: string) => void;
  onComment?: (postId: string, text: string) => void;
  onApprove?: (postId: string) => void;
  onReject?: (postId: string) => void;
  isModerator?: boolean;
  stats?: { avgStreak: number, totalPosts: number };
  leaderboard?: { name: string, avatar?: string, tokens: number, streak: number }[];
  currentUserWeight: number;
}

const Community: React.FC<CommunityProps> = ({ posts, currentUserId, currentUserName, currentUserAvatar, currentUserWeight, onShare, onEarnTokens, onLike, onComment, onApprove, onReject, isModerator, stats, leaderboard }) => {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<CommunityPost['type'] | null>(null); // 'presentation' | 'motivation' | null
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPosting = postType !== null;

  // User has posted if their ID is found in the posts list
  const hasPosted = posts.some(p => p.userId === currentUserId);

  const handleCommentSubmit = (postId: string) => {
    if (onComment && commentText.trim()) {
      onComment(postId, commentText);
      setCommentText('');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen -m-10 p-10 bg-[url('/assets/community-bg.png')] bg-fixed bg-cover">
      <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">

        {/* Header - Glassmorphism */}
        <header className="flex justify-between items-center bg-white/70 backdrop-blur-md p-8 rounded-[2rem] border border-white/50 shadow-lg">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Muro de Guerreros</span>
            </h1>
            <p className="text-slate-600 font-medium">Comparte tus victorias, inspira a la tribu.</p>
          </div>
          {!hasPosted && (
            <button onClick={() => setPostType('presentation')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/20 transition hover:scale-105 active:scale-95 animate-pulse flex items-center gap-2">
              <i className="fas fa-hand-paper"></i> Presentarme (+20 Tokens)
            </button>
          )}
          {hasPosted && (
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 mb-1">
                Miembro Verificado
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tribu NutriFit</span>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Feed */}
          <div className="lg:col-span-2 space-y-8">
            {/* Create Post Widget */}
            {isPosting ? (
              <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-emerald-100 animate-fadeIn relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-[100%] -mr-10 -mt-10 opacity-50 pointer-events-none"></div>

                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={currentUserAvatar || `https://ui-avatars.com/api/?name=${currentUserName}&background=10b981&color=fff`}
                    alt="My Avatar"
                    className="w-14 h-14 rounded-full border-4 border-emerald-50 shadow-sm"
                  />
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">¡Tu turno, {currentUserName}!</h3>
                    <p className="text-sm text-slate-500">
                      {postType === 'presentation' ? 'Cuéntanos sobre ti y tus metas.' : 'Comparte una foto o pensamiento.'}
                    </p>
                  </div>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-50 rounded-2xl p-6 min-h-[140px] outline-none border border-slate-100 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 transition text-slate-700 font-medium text-lg placeholder-slate-400 mb-4"
                  placeholder={postType === 'presentation' ? "Hola, soy..." : "Escribe aquí tu historia..."}
                />

                {/* Image Preview */}
                {selectedImage && (
                  <div className="relative mb-6 group">
                    <img src={selectedImage} alt="Preview" className="w-full h-64 object-cover rounded-2xl border-2 border-slate-100" />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-6">
                  {/* Add Image Button */}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition font-bold text-sm px-4 py-2 hover:bg-emerald-50 rounded-xl"
                    >
                      <i className="fas fa-camera text-lg"></i>
                      <span>Agregar Foto (+1 Token)</span>
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setPostType(null); setSelectedImage(null); }} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition">Cancelar</button>
                    <button
                      onClick={() => {
                        onShare(content, postType || 'motivation', selectedImage || undefined);
                        setPostType(null);
                        setContent('');
                        setSelectedImage(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black text-sm shadow-emerald-200 shadow-lg transition transform hover:-translate-y-1"
                    >
                      Publicar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Mini Create Trigger */
              <div onClick={() => setPostType('motivation')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition flex items-center gap-4 group">
                <img
                  src={currentUserAvatar || `https://ui-avatars.com/api/?name=${currentUserName}&background=10b981&color=fff`}
                  className="w-12 h-12 rounded-full opacity-80 group-hover:opacity-100 transition"
                />
                <div className="flex-1 bg-slate-50 h-12 rounded-full flex items-center px-6 text-slate-400 font-medium group-hover:bg-slate-100 transition">
                  ¿En qué estás pensando?
                </div>
                <button className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition">
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            )}

            {/* Feed Posts */}
            {posts.filter(p => p.status === 'published' || p.userId === currentUserId || (isModerator && p.status === 'pending')).map(post => {
              // Parse AI Content
              const isFoodAnalysis = post.content.includes("análisis de comida");
              let displayContent = <p className="text-slate-600 font-medium text-lg leading-relaxed mb-6 whitespace-pre-wrap">{post.content}</p>;

              if (isFoodAnalysis) {
                const parts = post.content.split('💡');
                const stats = parts[0].split('📊')[2] || parts[0];
                const summary = parts[1] || "";

                displayContent = (
                  <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
                    <div className="font-bold text-emerald-700 mb-2 flex items-center gap-2">
                      <i className="fas fa-chart-pie"></i> {stats.replace('Mi análisis de comida:', '').trim()}
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{summary}</p>
                  </div>
                );
              }

              return (
                <div key={post.id} className={`bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border transition duration-300 group
                 ${post.status === 'pending' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100/50 hover:shadow-lg hover:border-emerald-100'}
              `}>
                  {post.status === 'pending' && (
                    <div className="mb-4 flex items-center justify-between bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold w-full">
                      <span className="flex items-center gap-2"><i className="fas fa-clock"></i> Pendiente de aprobación</span>

                      {isModerator && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              console.log("Approve clicked in Feed", post.id);
                              e.stopPropagation();
                              if (onApprove) onApprove(post.id);
                              else alert("Error: Función Aprobar no conectada");
                            }}
                            className="bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600 transition shadow-sm z-10 relative"
                          >
                            <i className="fas fa-check mr-1"></i> Aprobar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onReject) onReject(post.id);
                            }}
                            className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition shadow-sm z-10 relative"
                          >
                            <i className="fas fa-times mr-1"></i> Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                          {post.userAvatar ? (
                            <img src={post.userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                              <i className="fas fa-user-circle text-2xl"></i>
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                          <i className={`fas ${post.type === 'hydration' ? 'fa-tint' : post.type === 'workout' ? 'fa-dumbbell' : 'fa-comment-alt'}`}></i>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg leading-tight">{post.userName}</h4>
                        <span className="text-xs text-slate-400 font-medium">{new Date(post.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button className="text-slate-300 hover:text-slate-500">
                      <i className="fas fa-ellipsis-h"></i>
                    </button>
                  </div>

                  <div className="pl-0 md:pl-20">
                    {displayContent}

                    {post.imageUrl && (
                      <div className={`mb-6 rounded-2xl overflow-hidden shadow-sm border border-slate-100 ${isFoodAnalysis ? 'w-32 h-32 float-right ml-4 -mt-20' : ''}`}> {/* Float image if analysis */}
                        <img src={post.imageUrl} alt="Post content" loading="lazy" decoding="async" className={`${isFoodAnalysis ? 'w-full h-full object-cover' : 'w-full h-auto max-h-96 object-cover'}`} />
                      </div>
                    )}

                    {/* Interaction Bar */}
                    <div className="flex items-center gap-6 pt-6 border-t border-slate-50">
                      <button
                        onClick={() => onLike && onLike(post.id)}
                        disabled={post.status === 'pending'}
                        className={`flex items-center gap-2 transition group/like ${post.isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500 disabled:opacity-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition ${post.isLiked ? 'bg-red-50' : 'bg-slate-50 group-hover/like:bg-red-50'}`}>
                          <i className={`${post.isLiked ? 'fas' : 'far'} fa-heart text-lg`}></i>
                        </div>
                        <span className="font-bold text-sm">{post.likes}</span>
                      </button>

                      <button
                        onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                        disabled={post.status === 'pending'}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition group/comment disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-50 group-hover/comment:bg-blue-50 flex items-center justify-center transition">
                          <i className="far fa-comment-alt group-hover/comment:text-blue-500 text-lg"></i>
                        </div>
                        <span className="font-bold text-sm">{post.comments?.length || 0} Comentarios</span>
                      </button>

                      {post.status === 'published' && (
                        <div className="ml-auto">
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                            <i className="fas fa-check-circle"></i> Validado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Comments Section */}
                    {activeCommentPostId === post.id && post.status === 'published' && (
                      <div className="mt-6 pt-6 border-t border-slate-50 bg-slate-50/50 rounded-xl p-4 animate-fadeIn">
                        {/* List */}
                        <div className="space-y-4 mb-4">
                          {post.comments && post.comments.length > 0 ? post.comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                <img src={comment.userAvatar || `https://ui-avatars.com/api/?name=${comment.userName}`} className="w-full h-full object-cover" />
                              </div>
                              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                                <p className="text-xs font-bold text-slate-700 mb-1">{comment.userName}</p>
                                <p className="text-sm text-slate-600">{comment.content}</p>
                              </div>
                            </div>
                          )) : (
                            <p className="text-center text-xs text-slate-400 italic">Sé el primero en comentar.</p>
                          )}
                        </div>

                        {/* Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                            placeholder="Escribe un comentario..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            onClick={() => handleCommentSubmit(post.id)}
                            className="bg-emerald-500 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20"
                          >
                            <i className="fas fa-paper-plane"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Sidebar */}
          <div className="hidden lg:block space-y-8">
            {/* Stats Card */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] shadow-sm border border-white/60">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <i className="fas fa-chart-line text-emerald-500"></i> Tendencias
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-50">
                  <span className="text-sm font-bold text-slate-600">🔥 Racha Promedio</span>
                  <span className="text-emerald-600 font-black">{stats?.avgStreak || 0} Días</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-50">
                  <span className="text-sm font-bold text-slate-600">🥗 Platos Compartidos</span>
                  <span className="text-emerald-600 font-black">{stats?.totalPosts || 0}</span>
                </div>
              </div>
            </div>

            {/* Challenge Card -> Now HydrationTracker */}
            <HydrationTracker
              weight={currentUserWeight}
              userName={currentUserName}
              onShare={onShare}
              variant="sidebar"
            />

            {/* Top Contributors */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] shadow-sm border border-white/60">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <i className="fas fa-crown text-amber-400"></i> Top Guerreros
              </h3>
              <div className="space-y-4">
                {leaderboard && leaderboard.length > 0 ? leaderboard.map((user, i) => (
                  <div key={user.name + i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff`} className="w-full h-full" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700 text-sm truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{user.tokens || 0} Tokens</p>
                    </div>
                    <span className={`font-black text-sm ${i === 0 ? 'text-amber-400' : 'text-slate-300'}`}>#{i + 1}</span>
                  </div>
                )) : <p className="text-xs text-slate-400">No hay datos aún.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Community;
