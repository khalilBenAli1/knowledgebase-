import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';

interface Formation {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  published: boolean;
  createdBy: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

type FormationStatus = 'active' | 'upcoming' | 'completed';

export default function FormationsPage() {
  const { user } = useAuthStore();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed' | 'drafts' | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    imageUrl: '',
  });

  const isAdmin = user?.role?.name === 'Responsable RH' || user?.role?.name === 'Gestionnaire RH';

  useEffect(() => {
    loadFormations();
  }, []);

  const getFormationStatus = (formation: Formation): FormationStatus => {
    const now = new Date();
    const start = new Date(formation.startDate);
    const end = formation.endDate ? new Date(formation.endDate) : null;

    if (end && now > end) {
      return 'completed';
    } else if (now < start) {
      return 'upcoming';
    } else {
      return 'active';
    }
  };

  const loadFormations = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (!isAdmin) {
        params.published = true;
      }

      const response = await api.get('/formations', { params });
      setFormations(response.data);
    } catch (error) {
      console.error('Failed to load formations', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        endDate: formData.endDate || undefined,
      };
      if (editingId) {
        await api.put(`/formations/${editingId}`, data);
        alert('Formation modifiée avec succès!');
      } else {
        await api.post('/formations', data);
        alert('Formation créée avec succès! Elle a été ajoutée aux brouillons. Vous pouvez l\'activer depuis l\'onglet "Brouillons".');
      }
      setFormData({ title: '', description: '', startDate: '', endDate: '', imageUrl: '' });
      setShowForm(false);
      setEditingId(null);
      loadFormations();
    } catch (error) {
      console.error('Failed to save formation', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (formation: Formation) => {
    setFormData({
      title: formation.title,
      description: formation.description,
      startDate: formation.startDate.split('T')[0],
      endDate: formation.endDate ? formation.endDate.split('T')[0] : '',
      imageUrl: formation.imageUrl || '',
    });
    setEditingId(formation.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) return;
    try {
      await api.delete(`/formations/${id}`);
      loadFormations();
    } catch (error) {
      console.error('Failed to delete formation', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleTogglePublish = async (id: string, published: boolean) => {
    try {
      if (published) {
        await api.put(`/formations/${id}/unpublish`);
      } else {
        await api.put(`/formations/${id}/publish`);
      }
      loadFormations();
    } catch (error) {
      console.error('Failed to toggle publish status', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const filteredFormations = formations.filter((formation) => {
    if (!isAdmin && !formation.published) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'drafts') return !formation.published;

    if (!formation.published) return false;

    const status = getFormationStatus(formation);
    return status === activeTab;
  });

  const getStatusBadge = (formation: Formation) => {
    if (!formation.published) {
      return (
        <span className="px-3 py-1 bg-gray-500 text-white text-xs font-bold rounded-full shadow-lg">
          BROUILLON
        </span>
      );
    }

    const status = getFormationStatus(formation);

    if (status === 'active') {
      return (
        <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
          🟢 ACTIVE
        </span>
      );
    } else if (status === 'upcoming') {
      return (
        <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg">
          🟡 À VENIR
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
          🔴 TERMINÉE
        </span>
      );
    }
  };

  const getStatusCounts = () => {
    const published = formations.filter(f => f.published);
    return {
      active: published.filter(f => getFormationStatus(f) === 'active').length,
      upcoming: published.filter(f => getFormationStatus(f) === 'upcoming').length,
      completed: published.filter(f => getFormationStatus(f) === 'completed').length,
      drafts: formations.filter(f => !f.published).length,
    };
  };

  const counts = getStatusCounts();

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
            <h1 className="text-3xl font-bold text-biat-primary">Les Formations</h1>
            <p className="text-gray-600 mt-1">Explorez les formations disponibles</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setFormData({ title: '', description: '', startDate: '', endDate: '', imageUrl: '' });
                setEditingId(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle formation
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🟢 Actives ({counts.active})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🟡 À venir ({counts.upcoming})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'completed'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔴 Terminées ({counts.completed})
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('drafts')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'drafts'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Brouillons ({counts.drafts})
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
            </>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-biat-primary">
                {editingId ? 'Modifier la formation' : 'Nouvelle formation'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ title: '', description: '', startDate: '', endDate: '', imageUrl: '' });
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
                  placeholder="Titre de la formation"
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
                  placeholder="Description détaillée de la formation..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date de fin (optionnel)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
                    min={formData.startDate}
                  />
                </div>
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
                    setFormData({ title: '', description: '', startDate: '', endDate: '', imageUrl: '' });
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
          {filteredFormations.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {activeTab === 'drafts'
                  ? 'Aucun brouillon'
                  : activeTab === 'active'
                  ? 'Aucune formation active'
                  : activeTab === 'upcoming'
                  ? 'Aucune formation à venir'
                  : activeTab === 'completed'
                  ? 'Aucune formation terminée'
                  : 'Aucune formation disponible'}
              </h3>
              <p className="text-gray-500">
                {isAdmin && activeTab === 'drafts'
                  ? 'Les brouillons que vous créez apparaîtront ici'
                  : 'Les formations apparaîtront ici dès leur publication'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFormations.map((formation) => (
                <div
                  key={formation.id}
                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                >
                  {formation.imageUrl && (
                    <div className="relative h-48 bg-gray-200">
                      <img
                        src={formation.imageUrl}
                        alt={formation.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                        }}
                      />
                      <div className="absolute top-3 right-3">
                        {getStatusBadge(formation)}
                      </div>
                    </div>
                  )}
                  {!formation.imageUrl && (
                    <div className={`p-3 border-b ${
                      !formation.published
                        ? 'bg-gray-50 border-gray-200'
                        : getFormationStatus(formation) === 'active'
                        ? 'bg-green-50 border-green-200'
                        : getFormationStatus(formation) === 'upcoming'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      {getStatusBadge(formation)}
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-biat-primary mb-3 line-clamp-2">{formation.title}</h3>
                    <p className="text-gray-600 mb-4 flex-1 line-clamp-4">{formation.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">Début:</span>
                        <span>{new Date(formation.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      {formation.endDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">Fin:</span>
                          <span>{new Date(formation.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{formation.createdBy.name}</span>
                      </div>

                      {isAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(formation)}
                            className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Modifier
                          </button>
                          <button
                            onClick={() => handleTogglePublish(formation.id, formation.published)}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors font-medium flex items-center justify-center gap-1 ${
                              formation.published
                                ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {formation.published ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                                Désactiver
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Activer
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(formation.id)}
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
