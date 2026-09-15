import React, { useState, useRef, useEffect } from 'react';
import { useAIChatbot } from '../../hooks/ai/useAIChatbot';

function ChatIcon({ name, size = 22 }) {
  const paths = {
    close: <path d="m6 6 12 12M18 6 6 18" />,
    send: <><path d="m4 5 16 7-16 7 3-7-3-7Z"/><path d="M7 12h13"/></>,
    bot: <><path d="M7 8.5h10a3 3 0 0 1 3 3v5.2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5.2a3 3 0 0 1 3-3Z"/><path d="M12 5V3M8.5 13h.1M15.5 13h.1M9 16.5h6"/></>,
    user: <><circle cx="12" cy="8.2" r="3.4"/><path d="M5.3 20c.8-4.2 3-6.2 6.7-6.2s5.9 2 6.7 6.2"/></>,
    trash: <><path d="M6.5 8h11M9 8V5.5h6V8M8 8l.7 11h6.6L16 8"/><path d="M11 11v5M14 11v5"/></>,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.bot}
    </svg>
  );
}

export default function AISupportChatbot({ showLauncher = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const { loading, messages, sendMessage, clearHistory } = useAIChatbot();

  useEffect(() => {
    const openChat = () => setIsOpen(true);
    const closeChat = () => setIsOpen(false);
    window.addEventListener('mercasto:open-ai-chat', openChat);
    window.addEventListener('mercasto:close-ai-chat', closeChat);
    return () => {
      window.removeEventListener('mercasto:open-ai-chat', openChat);
      window.removeEventListener('mercasto:close-ai-chat', closeChat);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;
    await sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'Cómo publico un anuncio?',
    'Es seguro comprar?',
    'Cuánto cuesta?',
    'Cómo contacto al vendedor?',
  ];

  return (
    <>
      {showLauncher && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-lime-500 to-green-500 text-slate-950 rounded-full p-4 shadow-2xl hover:shadow-xl transition-all hover:scale-110"
          aria-label="Chat de soporte"
        >
          <ChatIcon name={isOpen ? 'close' : 'bot'} size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[90] w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">
          <div className="bg-gradient-to-r from-lime-500 to-green-500 text-slate-950 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <ChatIcon name="bot" size={24} />
              </div>
              <div>
                <h3 className="font-bold">Mercasto AI</h3>
                <p className="text-xs opacity-90">Asistente 24/7</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Limpiar historial"
                aria-label="Limpiar historial"
              >
                <ChatIcon name="trash" size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Cerrar chat"
              >
                <ChatIcon name="close" size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center text-lime-500">
                  <ChatIcon name="bot" size={48} />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Hola! Soy Mercasto AI
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  En qué puedo ayudarte hoy?
                </p>
                <div className="space-y-2">
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => sendMessage(question)}
                      className="block w-full text-left px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-lime-50 dark:hover:bg-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-lime-100 dark:bg-lime-900/30 rounded-full flex items-center justify-center flex-shrink-0 text-lime-600">
                    <ChatIcon name="bot" size={16} />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-lime-500 text-white rounded-br-none'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-lime-100' : 'text-gray-500'}`}>
                    {new Date(message.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0 text-gray-700 dark:text-gray-300">
                    <ChatIcon name="user" size={16} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-lime-100 dark:bg-lime-900/30 rounded-full flex items-center justify-center text-lime-600">
                  <ChatIcon name="bot" size={16} />
                </div>
                <div className="bg-gray-100 dark:bg-slate-700 rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 p-4">
            <div className="flex gap-2">
              <textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-lime-500"
                rows="1"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || loading}
                className="bg-lime-500 hover:bg-lime-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                aria-label="Enviar mensaje"
              >
                <ChatIcon name="send" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
