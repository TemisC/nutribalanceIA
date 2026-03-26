import React, { useState, useRef, useEffect } from 'react';
import { Message, BiometricData } from '../types';
import { sendChatMessage } from '../services/geminiService';

interface ChatExpertProps {
  biometrics: BiometricData;
  mode?: 'nutrition' | 'trainer';
  onSpendToken: (amount: number, description: string) => boolean;
  initialInput?: string;
  userId: string;
}

const ChatExpert: React.FC<ChatExpertProps> = ({ biometrics, mode = 'nutrition', onSpendToken, initialInput = '', userId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialInput);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const heroTitle = mode === 'nutrition' ? 'Chat Nutricionista' : 'Chat Entrenador';
  const heroSubtitle = mode === 'nutrition' ? 'Experto en dietética y suplementación' : 'Experto en fitness y rutinas de ejercicio';
  const heroIcon = mode === 'nutrition' ? 'fa-user-md' : 'fa-dumbbell';
  const headerColor = mode === 'nutrition' ? 'from-emerald-900 to-emerald-800' : 'from-blue-900 to-blue-800';
  const accentColor = mode === 'nutrition' ? 'bg-emerald-500' : 'bg-blue-500';

  // Load history from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`chat_history_${mode}_${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert string dates back to Date objects
        const hydrated = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setMessages(hydrated);
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    } else {
      // Default Welcome Message if no history
      setMessages([
        {
          id: '1',
          role: 'model',
          text: mode === 'nutrition'
            ? 'Hola, soy tu Nutricionista de IA. ¿En qué puedo ayudarte hoy con tu dieta?'
            : '¡Hola! Soy tu Entrenador Personal. ¿Listo para entrenar? Pregúntame sobre rutinas o ejercicios.',
          timestamp: new Date()
        }
      ]);
    }
  }, [mode, userId]);

  // Save history to LocalStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${mode}_${userId}`, JSON.stringify(messages));
    }
  }, [messages, mode, userId]);

  // Auto-scroll to bottom effect
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    // 4. Token Logic: Try to spend 5 tokens
    const hasBalance = onSpendToken(5, `Chat con ${mode === 'trainer' ? 'Entrenador' : 'Nutricionista'} `);
    if (!hasBalance) return; // Stop if insufficient funds

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    // Focus back on input
    setTimeout(() => inputRef.current?.focus(), 10);
    setIsTyping(true);

    try {
      // Prepare history for context
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await sendChatMessage(
        userMessage.text,
        history,
        biometrics,
        { userName: 'User', role: 'client' }, // Context placeholder
        mode
      );

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("Chat Error Detailed:", error);
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'model',
        text: `⚠️ Error de conexión: ${error instanceof Error ? error.message : "Error desconocido"} `,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Simple Markdown Parser to avoid external dependencies
  const renderMarkdown = (text: string) => {
    // 1. Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\s*\n/);

    return paragraphs.map((paragraph, pIndex) => {
      // 2. Check for Headers (### Header)
      if (paragraph.startsWith('###')) {
        return <h3 key={pIndex} className="font-bold text-lg mb-2 mt-4 text-emerald-700">{paragraph.replace(/^###\s*/, '')}</h3>;
      }
      if (paragraph.startsWith('##')) {
        return <h2 key={pIndex} className="font-bold text-xl mb-3 mt-5 text-emerald-800">{paragraph.replace(/^##\s*/, '')}</h2>;
      }

      // 3. Check for Lists (- item or * item)
      // If the paragraph contains multiple list items separated by newline
      if (paragraph.match(/^[\-*]\s/m)) {
        const lines = paragraph.split('\n');
        return (
          <ul key={pIndex} className="list-disc pl-5 mb-3 space-y-1">
            {lines.map((line, lIndex) => {
              const cleanLine = line.replace(/^[\-*]\s*/, '');
              // Process bold/italic inside list item
              return <li key={lIndex} dangerouslySetInnerHTML={{ __html: parseInlineStyles(cleanLine) }}></li>;
            })}
          </ul>
        );
      }

      // 4. Regular Paragraph with inline styles
      return (
        <p key={pIndex} className="mb-3 last:mb-0" dangerouslySetInnerHTML={{ __html: parseInlineStyles(paragraph) }}></p>
      );
    });
  };

  const parseInlineStyles = (text: string) => {
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-red-500 px-1 rounded font-mono text-xs">$1</code>') // Code
      .replace(/\n/g, '<br />'); // Remaining newlines in a paragraph
    return formatted;
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden border border-slate-100 max-w-4xl mx-auto h-[85vh] relative">
      {/* Header */}
      <div className={`p-5 bg-gradient-to-r ${headerColor} text-white flex items-center justify-between shadow-md z-10 transition-colors duration-500`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center overflow-hidden`}>
              <i className={`fas ${heroIcon} text-2xl text-white`}></i>
            </div>
            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${accentColor} rounded-full border-2 border-slate-900 animate-pulse`}></div>
          </div>
          <div>
            <h3 className="font-bold text-lg">{heroTitle}</h3>
            <div className="flex items-center gap-1.5 opacity-80">
              <span className={`w-1.5 h-1.5 rounded-full ${accentColor} `}></span>
              <p className="text-[11px] font-bold uppercase tracking-widest">{heroSubtitle}</p>
            </div>
          </div>
        </div>
        <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition backdrop-blur-sm">
          <i className="fas fa-expand text-xs"></i>
        </button>
      </div>

      {/* Chat Area */}
      <div
        ref={messagesEndRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 scroll-smooth"
        style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`max-w-[85%] relative group ${m.role === 'user' ? 'items-end flex flex-col' : 'items-start flex flex-col'} `}>

              {/* Bubble */}
              <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${m.role === 'user'
                ? `${mode === 'nutrition' ? 'bg-emerald-600' : 'bg-blue-600'} text-white rounded-tr-sm`
                : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100'
                } `}>
                {m.role === 'user' ? m.text : renderMarkdown(m.text)}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] font-medium mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border border-slate-100 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-2">Escribiendo</span>
              <div className={`w-1.5 h-1.5 ${accentColor} rounded-full animate-bounce`}></div>
              <div className={`w-1.5 h-1.5 ${accentColor} rounded-full animate-bounce [animation-delay:-0.15s]`}></div>
              <div className={`w-1.5 h-1.5 ${accentColor} rounded-full animate-bounce [animation-delay:-0.3s]`}></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 relative z-20">
        <div className={`flex items-end gap-2 bg-slate-100/70 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-opacity-50 focus-within:bg-white transition-all ${mode === 'nutrition' ? 'focus-within:ring-emerald-500 focus-within:border-emerald-500' : 'focus-within:ring-blue-500 focus-within:border-blue-500'} `}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe tu mensaje aquí..."
            ref={inputRef}
            className="flex-1 bg-transparent border-none px-4 py-3 text-sm focus:ring-0 outline-none resize-none max-h-32 min-h-[50px]"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all mb-0.5 ${!input.trim() || isTyping
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : `${mode === 'nutrition' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'} text-white shadow-lg hover:scale-105 active:scale-95`
              } `}
          >
            {isTyping ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
          <i className="fas fa-bolt text-amber-400"></i> Powered by Gemini 1.5 Pro
        </p>
      </div>
    </div>
  );
};


export default ChatExpert;
