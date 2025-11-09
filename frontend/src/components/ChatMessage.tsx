import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import TypewriterText from './TypewriterText';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sourceRefs?: any[];
  };
  isLatest?: boolean;
  showTypewriter?: boolean;
}

export default function ChatMessage({ message, isLatest = false, showTypewriter = false }: ChatMessageProps) {
  const [feedback, setFeedback] = useState<'useful' | 'not_useful' | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [typingComplete, setTypingComplete] = useState(!showTypewriter);

  const handleFeedback = async (rating: 'useful' | 'not_useful') => {
    setFeedback(rating);
    setShowFeedbackForm(true);
  };

  const submitFeedback = async () => {
    try {
      await api.post('/feedback', {
        messageId: message.id,
        rating: feedback,
        comment: feedbackComment,
      });
      setShowFeedbackForm(false);
    } catch (error) {
      console.error('Failed to submit feedback', error);
    }
  };

  return (
    <div
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-3xl px-5 py-3 rounded-xl shadow-sm ${
          message.role === 'user'
            ? 'bg-biat-primary text-white dark:bg-biat-primary dark:text-white'
            : 'bg-biat-50 text-biat-secondary border border-biat-100 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
        }`}
      >
        <div className="prose prose-sm max-w-none">
          {message.role === 'user' ? (
            <p className="text-white dark:text-white m-0">{message.content}</p>
          ) : showTypewriter && isLatest ? (
            <div className="text-biat-secondary dark:text-gray-100">
              <TypewriterText
                text={message.content}
                speed={15}
                onComplete={() => setTypingComplete(true)}
              />
            </div>
          ) : (
            <div className="text-biat-secondary dark:text-gray-100">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.role === 'assistant' && !feedback && typingComplete && (
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => handleFeedback('useful')}
              className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 dark:border-green-700"
            >
              👍 Utile
            </button>
            <button
              onClick={() => handleFeedback('not_useful')}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 dark:border-red-700"
            >
              👎 Pas utile
            </button>
          </div>
        )}

        {showFeedbackForm && (
          <div className="mt-3 space-y-2">
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Commentaire optionnel..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-biat-primary"
              rows={2}
            />
            <button
              onClick={submitFeedback}
              className="text-xs px-4 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-all dark:bg-biat-primary dark:text-white dark:hover:bg-biat-accent"
            >
              Envoyer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
