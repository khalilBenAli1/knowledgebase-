import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import ChatMessage from '../components/ChatMessage';
import SourcesList from '../components/SourcesList';
import TypingIndicator from '../components/TypingIndicator';

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSources, setSelectedSources] = useState<any[]>([]);
  const [latestMessageId, setLatestMessageId] = useState<string | null>(null);
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

      if (message.sourceRefs && message.sourceRefs.length > 0) {
        setSelectedSources(message.sourceRefs);
      }
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
    setSelectedSources([]);
    setLatestMessageId(null);
  };

  return (
    <div className="flex h-full">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={startNewChat}
            className="w-full bg-biat-primary text-white px-4 py-2 rounded-lg hover:bg-biat-accent transition-all shadow-sm hover:shadow-md"
          >
            Nouvelle conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
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
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && !loading && (
            <div className="text-center mt-20">
              <div className="inline-block bg-biat-50 p-6 rounded-2xl mb-6">
                <svg className="w-20 h-20 text-biat-primary mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-biat-primary mb-4">Assistant IA - Règlement Intérieur</h2>
              <p className="text-biat-secondary/70 text-lg">Posez vos questions sur le règlement intérieur d'Assurances BIAT</p>
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

        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
            <div className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary focus:border-transparent transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-biat-primary text-white px-6 py-3 rounded-lg hover:bg-biat-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {loading ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {selectedSources.length > 0 && (
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <SourcesList sources={selectedSources} />
        </div>
      )}
    </div>
  );
}
