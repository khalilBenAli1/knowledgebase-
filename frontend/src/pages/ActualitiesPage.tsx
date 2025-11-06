import { useState, useEffect } from 'react';
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
  updatedAt: string;
}

export default function ActualitiesPage() {
  const { user } = useAuthStore();
  const [actualities, setActualities] = useState<Actuality[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'published' | 'drafts' | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
  });

  const isAdmin = user?.role?.name === 'Responsable RH' || user?.role?.name === 'Gestionnaire RH';

  useEffect(() => {
    loadActualities();
  }, [activeTab]);

  const loadActualities = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (!isAdmin) {
        params.published = true;
      } else {
        if (activeTab === 'published') params.published = true;
        else if (activeTab === 'drafts') params.published = false;
      }

      const response = await api.get('/actualities', { params });
      setActualities(response.data);
    } catch (error) {
      console.error('Failed to load actualities', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/actualities/${editingId}`, formData);
        alert('Actualité modifiée avec succès!');
      } else {
        await api.post('/actualities', formData);
        alert('Actualité créée avec succès! Elle a été ajoutée aux brouillons. Vous pouvez l\'activer depuis l\'onglet "Brouillons".');
      }
      setFormData({ title: '', description: '', imageUrl: '' });
      setShowForm(false);
      setEditingId(null);
      loadActualities();
    } catch (error) {
      console.error('Failed to save actuality', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (actuality: Actuality) => {
    setFormData({
      title: actuality.title,
      description: actuality.description,
      imageUrl: actuality.imageUrl || '',
    });
    setEditingId(actuality.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette actualité ?')) return;
    try {
      await api.delete(`/actualities/${id}`);
      loadActualities();
    } catch (error) {
      console.error('Failed to delete actuality', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleTogglePublish = async (id: string, published: boolean) => {
    try {
      if (published) {
        await api.put(`/actualities/${id}/unpublish`);
      } else {
        await api.put(`/actualities/${id}/publish`);
      }
      loadActualities();
    } catch (error) {
      console.error('Failed to toggle publish status', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const filteredActualities = actualities;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-biat-primary">Les Actualités</h1>
            <p className="text-gray-600 mt-1">Découvrez les dernières nouvelles et annonces</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setFormData({ title: '', description: '', imageUrl: '' });
                setEditingId(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle actualité
            </button>
          )}
        </div>

        {/* Tabs for Admin */}
        {isAdmin && (
          <div className="max-w-7xl mx-auto mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab('published')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'published'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Publiées ({actualities.filter(a => a.published).length})
            </button>
            <button
              onClick={() => setActiveTab('drafts')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'drafts'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Brouillons ({actualities.filter(a => !a.published).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes
            </button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-biat-primary">
                {editingId ? 'Modifier l\'actualité' : 'Nouvelle actualité'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ title: '', description: '', imageUrl: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
                  placeholder="Titre de l'actualité"
                  required
                  maxLength={255}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.title.length}/255 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent resize-none"
                  placeholder="Description détaillée de l'actualité..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  URL de l'image (optionnel)
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={formData.imageUrl}
                      alt="Aperçu"
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors font-medium"
                >
                  {editingId ? 'Mettre à jour' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ title: '', description: '', imageUrl: '' });
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {filteredActualities.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {activeTab === 'drafts' ? 'Aucun brouillon' : 'Aucune actualité disponible'}
              </h3>
              <p className="text-gray-500">
                {isAdmin && activeTab === 'drafts'
                  ? 'Les brouillons que vous créez apparaîtront ici'
                  : 'Les actualités apparaîtront ici dès leur publication'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActualities.map((actuality) => (
                <div
                  key={actuality.id}
                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                >
                  {actuality.imageUrl && (
                    <div className="relative h-48 bg-gray-200">
                      <img
                        src={actuality.imageUrl}
                        alt={actuality.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                        }}
                      />
                      {!actuality.published && (
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg">
                            BROUILLON
                          </span>
                        </div>
                      )}
                      {actuality.published && (
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                            PUBLIÉ
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {!actuality.imageUrl && !actuality.published && (
                    <div className="p-2 bg-yellow-50 border-b border-yellow-200">
                      <span className="text-yellow-700 text-xs font-semibold">● Brouillon</span>
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-biat-primary mb-3 line-clamp-2">{actuality.title}</h3>
                    <p className="text-gray-600 mb-4 flex-1 line-clamp-4">{actuality.description}</p>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium">{actuality.createdBy.name}</span>
                        </div>
                        <div>{new Date(actuality.createdAt).toLocaleDateString('fr-FR')}</div>
                      </div>

                      {isAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(actuality)}
                            className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Modifier
                          </button>
                          <button
                            onClick={() => handleTogglePublish(actuality.id, actuality.published)}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors font-medium flex items-center justify-center gap-1 ${
                              actuality.published
                                ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {actuality.published ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                                Dépublier
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Publier
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(actuality.id)}
                            className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
