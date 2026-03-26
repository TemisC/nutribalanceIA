import React, { useState, useMemo } from 'react';
import { UserMessage } from '../types';

interface CoachInboxProps {
    messages: UserMessage[];
    currentUserId: string; // Add currentUserId prop
    onMarkRead: (messageId: string) => void;
    onReply: (receiverId: string, text: string) => void;
}

const CoachInbox: React.FC<CoachInboxProps> = ({ messages = [], currentUserId, onMarkRead, onReply }) => {
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Group messages by Conversation ID (Client ID)
    const conversations = useMemo(() => {
        const groups: { [key: string]: { name: string; msgs: UserMessage[]; unread: number; lastMsg: UserMessage } } = {};

        messages.forEach(msg => {
            // Determine the "Other Party" ID (The Client)
            let otherId = msg.senderId;
            let otherName = msg.from;

            // If I sent the message, the 'other' is the receiver
            if (msg.senderId === currentUserId) {
                otherId = msg.receiverId;
                // We don't have receiver name in message usually, but we can try to find it from previous incoming messages from that ID
                // For now, if we don't know the name, we use "Alumno" or wait for an incoming message to fill it
                otherName = groups[otherId]?.name || 'Alumno';
            }

            if (!otherId) return; // Should not happen if data is integrity checked

            if (!groups[otherId]) {
                groups[otherId] = {
                    name: otherName,
                    msgs: [],
                    unread: 0,
                    lastMsg: msg
                };
            }

            // If we find a message FROM the client, that name is authoritative. Update group name.
            if (msg.senderId !== currentUserId) {
                groups[otherId].name = msg.from;
            }

            groups[otherId].msgs.push(msg);

            // Only count unread if it is FROM the client
            if (!msg.read && msg.senderId !== currentUserId) {
                groups[otherId].unread++;
            }

            // Track last message (latest timestamp)
            if (new Date(msg.timestamp).getTime() > new Date(groups[otherId].lastMsg.timestamp).getTime()) {
                groups[otherId].lastMsg = msg;
            }
        });

        return Object.entries(groups)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => new Date(b.lastMsg.timestamp).getTime() - new Date(a.lastMsg.timestamp).getTime());
    }, [messages, currentUserId]);

    const activeConversation = selectedClientId ? conversations.find(c => c.id === selectedClientId) : null;

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex gap-6 animate-fadeIn">

            {/* Sidebar: Client List */}
            <div className="w-1/3 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900">Mensajes</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                        {conversations.length} Conversaciones
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {conversations.map(conv => (
                        <button
                            key={conv.id}
                            onClick={() => setSelectedClientId(conv.id)}
                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left ${selectedClientId === conv.id ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'hover:bg-slate-50 border border-transparent'}`}
                        >
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${selectedClientId === conv.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-500'}`}>
                                    {conv.name.charAt(0)}
                                </div>
                                {conv.unread > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                                        {conv.unread}
                                    </div>
                                )}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <h4 className={`font-bold text-sm truncate ${selectedClientId === conv.id ? 'text-emerald-900' : 'text-slate-700'}`}>{conv.name}</h4>
                                <p className="text-xs text-slate-400 truncate mt-0.5">{conv.lastMsg.text}</p>
                            </div>
                        </button>
                    ))}

                    {conversations.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <i className="fas fa-inbox text-4xl mb-3 opacity-20"></i>
                            <p className="text-xs font-bold">Sin mensajes aún</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Area: Chat Thread */}
            <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col relative">
                {activeConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                                    {activeConversation.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{activeConversation.name}</h3>
                                    <span className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Cliente Activo
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 custom-scrollbar flex flex-col">
                            {/* Note: Messages are rendered in reverse order (newest at bottom visually if standard chat, but here we iterate normally? Let's check array order) */}
                            {/* Input array is chronological or reverse? Inbox usually showed newest first. Let's sorting by timestamp ASC for chat view */}
                            {activeConversation.msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map(msg => {
                                const isMe = msg.senderId === currentUserId || msg.from === 'Yo';
                                return (
                                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'} animate-fadeIn`}>
                                        {/* Wait, if we are Coach, user.messages contains messages SENT BY CLIENT. 
                             Does it contain messages SENT BY COACH? 
                             The `getMessages` endpoint gets `WHERE receiver_id = ?`. So only Incoming.
                             To show full history we need both.
                             For now, let's just show Incoming.
                         */}
                                        <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm border ${isMe ? 'bg-emerald-500 text-white border-emerald-500 rounded-tr-none' : 'bg-white text-slate-600 border-slate-100 rounded-tl-none'}`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300 mt-2 ml-1 uppercase">{msg.timestamp}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Reply Box */}
                        <div className="p-4 bg-white border-t border-slate-100">
                            <div className="relative">
                                <textarea
                                    id="coach-reply-input"
                                    className="w-full bg-slate-50 rounded-2xl pl-4 pr-14 py-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                    rows={1} // Auto-expand would be nice but keeping simple
                                    placeholder={`Escribe una respuesta para ${activeConversation.name}...`}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            const val = (e.target as HTMLTextAreaElement).value;
                                            if (val.trim()) {
                                                onReply(activeConversation.id, val); // receiverId is conversation ID (Client ID)
                                                (e.target as HTMLTextAreaElement).value = '';
                                            }
                                        }
                                    }}
                                ></textarea>
                                <button
                                    onClick={() => {
                                        const input = document.getElementById('coach-reply-input') as HTMLTextAreaElement;
                                        if (input && input.value.trim()) {
                                            onReply(activeConversation.id, input.value);
                                            input.value = '';
                                        }
                                    }}
                                    className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center transform hover:scale-105 active:scale-95"
                                >
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>

                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-4xl">
                            <i className="fas fa-comments"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-400">Selecciona un chat</h3>
                        <p className="text-sm font-medium max-w-xs text-center mt-2 opacity-60">Elige un alumno de la lista para ver su historial de mensajes y responderle.</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default CoachInbox;
