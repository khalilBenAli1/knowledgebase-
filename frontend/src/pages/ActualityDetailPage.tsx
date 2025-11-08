import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';

interface Actuality {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  published: boolean;
  createdBy: {
    name: string;
  };
  createdAt: string;
}

interface ActualityStats {
  views: number;
  likes: number;
  comments: number;
}

interface Comment {
  id: string;
  userId: string;
  user: {
    name: string;
  };
  comment: string;
  parentCommentId: string | null;
  createdAt: string;
}

export default function ActualityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [actuality, setActuality] = useState<Actuality | null>(null);
  const [stats, setStats] = useState<ActualityStats>({ views: 0, likes: 0, comments: 0 });
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      loadActuality();
      recordView();
      loadStats();
      loadComments();
      checkIfLiked();
    }
  }, [id]);

  const loadActuality = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/actualities/${id}`);
      setActuality(response.data);
    } catch (error) {
      console.error('Failed to load actuality', error);
      alert('Erreur lors du chargement de l\'actualité');
      navigate('/actualites');
    } finally {
      setLoading(false);
    }
  };

  const recordView = async () => {
    try {
      await api.post(`/actualities/${id}/view`);
    } catch (error) {
      console.error('Failed to record view', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get(`/actualities/${id}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  };

  const loadComments = async () => {
    try {
      const response = await api.get(`/actualities/${id}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments', error);
    }
  };

  const checkIfLiked = async () => {
    try {
      const response = await api.get('/actualities/user/liked');
      const likedIds = response.data;
      setLiked(likedIds.includes(id));
    } catch (error) {
      console.error('Failed to check if liked', error);
    }
  };

  const handleLike = async () => {
    try {
      const response = await api.post(`/actualities/${id}/like`);
      setLiked(response.data.liked);
      loadStats();
    } catch (error) {
      console.error('Failed to toggle like', error);
      alert('Erreur lors du like');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await api.post(`/actualities/${id}/comments`, {
        comment: newComment,
      });
      setNewComment('');
      loadComments();
      loadStats();
    } catch (error) {
      console.error('Failed to submit comment', error);
      alert('Erreur lors de l\'envoi du commentaire');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyText.trim()) return;

    setSubmittingComment(true);
    try {
      await api.post(`/actualities/${id}/comments`, {
        comment: replyText,
        parentCommentId,
      });
      setReplyText('');
      setReplyingTo(null);
      loadComments();
      loadStats();
    } catch (error) {
      console.error('Failed to submit reply', error);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;

    try {
      await api.delete(`/actualities/comments/${commentId}`);
      loadComments();
      loadStats();
    } catch (error) {
      console.error('Failed to delete comment', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'À l\'instant';
    if (diffInMins < 60) return `Il y a ${diffInMins} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Group comments by parent
  const topLevelComments = comments.filter(c => !c.parentCommentId);
  const getReplies = (commentId: string) => comments.filter(c => c.parentCommentId === commentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  if (!actuality) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600">Actualité non trouvée</p>
          <button
            onClick={() => navigate('/actualites')}
            className="mt-4 px-4 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent"
          >
            Retour aux actualités
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/actualites')}
          className="mb-4 flex items-center gap-2 text-biat-primary hover:text-biat-accent transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour aux actualités
        </button>

        {/* Actuality Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Image */}
          {actuality.imageUrl && (
            <div className="relative h-96 bg-gray-200">
              <img
                src={actuality.imageUrl}
                alt={actuality.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Title */}
            <h1 className="text-4xl font-bold text-biat-primary mb-4">{actuality.title}</h1>

            {/* Meta */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 bg-biat-primary text-white rounded-full flex items-center justify-center font-bold">
                  {actuality.createdBy.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{actuality.createdBy.name}</p>
                  <p className="text-sm text-gray-500">{formatDate(actuality.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-gray-700 whitespace-pre-wrap">{actuality.description}</p>
            </div>

            {/* Stats and Actions */}
            <div className="flex items-center justify-between py-4 border-t border-b border-gray-200">
              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-medium">{stats.views}</span>
                  <span>vues</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span className="font-medium">{stats.likes}</span>
                  <span>j'aime</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span className="font-medium">{stats.comments}</span>
                  <span>commentaires</span>
                </div>
              </div>

              {/* Like Button */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all font-medium ${
                  liked
                    ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {liked ? 'J\'aime' : 'Aimer'}
              </button>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Commentaires ({stats.comments})
          </h2>

          {/* Add Comment Form */}
          <form onSubmit={handleSubmitComment} className="mb-8">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-biat-primary text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Écrivez un commentaire..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-6 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? 'Envoi...' : 'Commenter'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {topLevelComments.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <p className="text-gray-500">Aucun commentaire pour le moment</p>
                <p className="text-gray-400 text-sm">Soyez le premier à commenter!</p>
              </div>
            ) : (
              topLevelComments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                  {/* Main Comment */}
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-300 text-gray-700 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {comment.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-900">{comment.user.name}</p>
                          <p className="text-xs text-gray-500">{getTimeAgo(comment.createdAt)}</p>
                        </div>
                        <p className="text-gray-700">{comment.comment}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="text-biat-primary hover:text-biat-accent font-medium"
                        >
                          Répondre
                        </button>
                        {comment.userId === user?.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>

                      {/* Reply Form */}
                      {replyingTo === comment.id && (
                        <div className="mt-4 ml-4 flex gap-3">
                          <div className="w-8 h-8 bg-biat-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Écrivez une réponse..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent resize-none text-sm"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                                className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-700"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={submittingComment || !replyText.trim()}
                                className="px-4 py-1.5 text-sm bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors disabled:opacity-50"
                              >
                                {submittingComment ? 'Envoi...' : 'Répondre'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {getReplies(comment.id).length > 0 && (
                        <div className="mt-4 ml-4 space-y-4">
                          {getReplies(comment.id).map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <div className="w-8 h-8 bg-gray-300 text-gray-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {reply.user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-semibold text-gray-900 text-sm">{reply.user.name}</p>
                                    <p className="text-xs text-gray-500">{getTimeAgo(reply.createdAt)}</p>
                                  </div>
                                  <p className="text-gray-700 text-sm">{reply.comment}</p>
                                </div>
                                {reply.userId === user?.id && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium mt-1"
                                  >
                                    Supprimer
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
