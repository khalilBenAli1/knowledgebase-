import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import ChatMessage from '../components/ChatMessage';
import TypingIndicator from '../components/TypingIndicator';
import ChatSearch from '../components/ChatSearch';
import Autocomplete from '../components/Autocomplete';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceRefs?: any[];
}

interface Session {
  id: string;
  title: string;
  startedAt: string;
}

export default function ChatPage() {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [latestMessageId, setLatestMessageId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const response = await api.get('/chat/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions', error);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await api.get(`/chat/sessions/${sessionId}/messages`);
      setMessages(response.data);
      setLatestMessageId(null); // Reset when loading old messages
    } catch (error) {
      console.error('Failed to load messages', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setLoading(true);

    const tempUserMessage: Message = {
      id: 'temp-user',
      role: 'user',
      content: question,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await api.post('/chat', {
        question,
        sessionId: currentSessionId,
      });

      const { sessionId, message } = response.data;

      if (!currentSessionId) {
        setCurrentSessionId(sessionId);
        loadSessions();
      }

      setMessages((prev) => prev.filter((m) => m.id !== 'temp-user'));
      setMessages((prev) => [
        ...prev,
        { ...tempUserMessage, id: 'user-' + Date.now() },
        message,
      ]);

      // Mark this as the latest message for typewriter effect
      setLatestMessageId(message.id);

      // Source citations hidden per user request
      // if (message.sourceRefs && message.sourceRefs.length > 0) {
      //   setSelectedSources(message.sourceRefs);
      // }
    } catch (error) {
      console.error('Failed to send message', error);
      setMessages((prev) => prev.filter((m) => m.id !== 'temp-user'));
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setLatestMessageId(null);
    setShowSearch(false);
  };

  const handleSearchResultClick = (sessionId: string, _messageId: string) => {
    setCurrentSessionId(sessionId);
    setShowSearch(false);
    setSidebarOpen(false);
    // Message will be loaded when currentSessionId changes
  };

  return (
    <div className="flex h-full relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-gray-200 space-y-2">
          <button
            onClick={startNewChat}
            className="w-full bg-biat-primary text-white px-4 py-2 rounded-lg hover:bg-biat-accent transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle conversation
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`w-full px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 ${
              showSearch
                ? 'bg-primary-100 text-primary-700 border-2 border-primary-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Rechercher
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {showSearch ? (
            <ChatSearch onResultClick={handleSearchResultClick} />
          ) : (
            <>
              <h3 className="text-sm font-semibold text-biat-secondary mb-2">Historique</h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      currentSessionId === session.id
                        ? 'bg-biat-100 text-biat-primary font-semibold border border-biat-200'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="truncate">{session.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(session.startedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {/* Mobile Header with Menu Button */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-biat-primary">Assistant RH</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          {messages.length === 0 && !loading && (
            <div className="text-center mt-10 md:mt-20 px-4">
              <div className="inline-block bg-biat-50 p-4 md:p-6 rounded-2xl mb-4 md:mb-6">
                <svg className="w-12 h-12 md:w-20 md:h-20 text-biat-primary mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                </svg>
              </div>
              <h2 className="text-xl md:text-3xl font-bold text-biat-primary mb-3 md:mb-4">Assistant RH</h2>
              <p className="text-biat-secondary/70 text-sm md:text-lg">Votre assistant intelligent pour les questions RH et le règlement intérieur d'Assurances BIAT</p>
            </div>
          )}
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id || index}
                message={message}
                isLatest={message.id === latestMessageId}
                showTypewriter={message.id === latestMessageId && message.role === 'assistant'}
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4 md:p-6 bg-white dark:bg-gray-800">
          <div className="w-full px-2 md:px-4">
            <form onSubmit={handleSendMessage}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Autocomplete
                  value={input}
                  onChange={setInput}
                  onSelect={(suggestion) => {
                    setInput(suggestion);
                    // Optionally auto-submit when a suggestion is selected
                    // setTimeout(() => handleSendMessage(new Event('submit') as any), 100);
                  }}
                  placeholder={t('chat.placeholder')}
                  className="flex-1 px-5 py-4 md:px-6 md:py-5 text-lg md:text-xl border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-biat-primary focus:border-biat-primary transition-all shadow-sm"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-biat-primary text-white px-8 py-4 md:px-10 md:py-5 text-lg md:text-xl rounded-xl hover:bg-biat-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg whitespace-nowrap font-semibold"
                >
                  {loading ? t('chat.sending') : t('chat.send')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Source citations hidden per user request */}
      {/* {selectedSources.length > 0 && (
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <SourcesList sources={selectedSources} />
        </div>
      )} */}
    </div>
  );
}
