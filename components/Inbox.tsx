
import React from 'react';
import { UserMessage } from '../types';

interface InboxProps {
  messages: UserMessage[];
  currentUserId: string;
  onMarkRead: (messageId: string) => void;
  onReply: (receiverId: string, text: string) => Promise<any>;
  coachId?: string; // Add coachId prop
}

const Inbox: React.FC<InboxProps> = ({ messages = [], currentUserId, onMarkRead, onReply, coachId }) => {
  const [sendingId, setSendingId] = React.useState<string | null>(null);

  const [activeTab, setActiveTab] = React.useState<'chat' | 'notifications'>('chat');

  // Filter messages
  const chatMessages = messages.filter(m => m.type === 'chat' || !m.type).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Chronological
  const systemMessages = messages.filter(m => m.type === 'system').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Reverse Chronological (Newest top)

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-fadeIn">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Buzón & Chat</h1>
          <p className="text-slate-500 font-medium">Comunícate con tu coach y revisa tus notificaciones.</p>
        </div>

        {/* Tabs */}
        <div className="bg-slate-100 p-1 rounded-2xl flex font-bold text-sm">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'chat' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className="fas fa-comments"></i>
            Chat con Coach
            {chatMessages.some(m => !m.read && m.senderId !== currentUserId) && (
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-6 py-3 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'notifications' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className="fas fa-bell"></i>
            Notificaciones
            {systemMessages.some(m => !m.read) && (
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative flex flex-col">

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar flex flex-col">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-60">
                  <i className="fas fa-comment-dots text-6xl mb-4"></i>
                  <p>Inicia una conversación con tu coach</p>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.from === 'Yo' || msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm 
                                    ${isMe ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-white text-slate-600 border border-slate-100 rounded-tl-none'}
                                `}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 mt-1 uppercase px-1">{typeof msg.timestamp === 'string' ? msg.timestamp : 'Hace poco'}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative">
                <textarea
                  id="chat-reply-input"
                  placeholder="Escribe un mensaje a tu coach..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-14 py-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const val = (e.target as HTMLTextAreaElement).value;
                      if (val.trim()) {
                        setSendingId('new');
                        // Use specific coachId if available, fallback to 'admin' (or error?)
                        // Assuming there is a generic admin or unassigned messages go there.
                        onReply(coachId || 'admin', val).then(() => setSendingId(null)); // receiverId logic handled in App
                        (e.target as HTMLTextAreaElement).value = '';
                      }
                    }
                  }}
                ></textarea>
                <button
                  onClick={() => {
                    const input = document.getElementById('chat-reply-input') as HTMLTextAreaElement;
                    if (input && input.value.trim()) {
                      setSendingId('new');
                      onReply(coachId || 'admin', input.value).then(() => setSendingId(null));
                      input.value = '';
                    }
                  }}
                  disabled={sendingId === 'new'}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg transition flex items-center justify-center transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {sendingId ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                </button>
              </div>
            </div>
          </>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {systemMessages.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 text-2xl">
                  <i className="fas fa-bell-slash"></i>
                </div>
                <p className="text-slate-400 font-medium">No tienes notificaciones nuevas</p>
              </div>
            ) : (
              systemMessages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => !msg.read && onMarkRead(msg.id)}
                  className={`p-5 rounded-2xl border flex gap-4 transition-all relative ${!msg.read ? 'bg-white border-emerald-500 shadow-lg shadow-emerald-500/5' : 'bg-slate-50 border-transparent opacity-75'}`}
                >
                  {!msg.read && <div className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full"></div>}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 ${!msg.read ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    <i className="fas fa-info-circle"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{msg.from || 'Sistema'}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{msg.text}</p>
                    <span className="text-[10px] font-bold text-slate-400 mt-2 block uppercase">{typeof msg.timestamp === 'string' ? msg.timestamp : 'Hace poco'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Inbox;
