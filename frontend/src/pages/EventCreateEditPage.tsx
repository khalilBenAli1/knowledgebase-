import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

interface FormField {
  id?: string;
  label: string;
  fieldType: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  event?: any;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texte court', icon: '📝' },
  { value: 'textarea', label: 'Texte long', icon: '📄' },
  { value: 'select', label: 'Liste déroulante', icon: '📋' },
  { value: 'radio', label: 'Choix unique', icon: '🔘' },
  { value: 'checkbox', label: 'Choix multiple', icon: '☑️' },
  { value: 'number', label: 'Nombre', icon: '🔢' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Téléphone', icon: '📱' },
];

export default function EventCreateEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      const event = response.data;
      setTitle(event.title);
      setDescription(event.description);
      setEventDate(new Date(event.eventDate).toISOString().slice(0, 16));
      setLocation(event.location || '');
      setImageUrl(event.imageUrl || '');
      setFormFields(event.formFields || []);
    } catch (error) {
      console.error('Failed to load event', error);
      toast.error('Erreur lors du chargement');
      navigate('/evenements');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = (fieldType: string) => {
    const newField: FormField = {
      label: '',
      fieldType,
      required: false,
      options: fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox' ? [] : undefined,
      placeholder: '',
      order: formFields.length,
    };
    setEditingField(newField);
    setShowFieldConfig(true);
  };

  const handleSaveField = () => {
    if (!editingField) return;

    if (!editingField.label.trim()) {
      toast.error('Le label est obligatoire');
      return;
    }

    if ((editingField.fieldType === 'select' || editingField.fieldType === 'radio' || editingField.fieldType === 'checkbox') &&
        (!editingField.options || editingField.options.length === 0)) {
      toast.error('Veuillez ajouter au moins une option');
      return;
    }

    if (editingField.id) {
      // Update existing field
      setFormFields(formFields.map(f => f.id === editingField.id ? editingField : f));
    } else {
      // Add new field
      setFormFields([...formFields, { ...editingField, id: Date.now().toString() }]);
    }

    setEditingField(null);
    setShowFieldConfig(false);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setShowFieldConfig(true);
  };

  const handleDeleteField = (fieldId: string) => {
    setFormFields(formFields.filter(f => f.id !== fieldId));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...formFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFormFields(newFields.map((f, i) => ({ ...f, order: i })));
  };

  const handleSubmit = async (e: React.FormEvent, shouldPublish = false) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !eventDate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSubmitting(true);

      const eventData = {
        title,
        description,
        eventDate: new Date(eventDate).toISOString(),
        location: location || undefined,
        imageUrl: imageUrl || undefined,
        formFields: formFields.map(({ id, createdAt, updatedAt, event, ...field }) => field),
      };

      let eventId = id;

      if (isEditMode) {
        await api.put(`/events/${id}`, eventData);
        toast.success('Événement modifié avec succès');
      } else {
        const response = await api.post('/events', eventData);
        eventId = response.data.id;
        toast.success('Événement créé avec succès');
      }

      if (shouldPublish && eventId) {
        await api.put(`/events/${eventId}/publish`);
        toast.success('Événement publié !');
      }

      navigate('/evenements');
    } catch (error) {
      console.error('Failed to save event', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const addOption = () => {
    if (!editingField) return;
    setEditingField({
      ...editingField,
      options: [...(editingField.options || []), ''],
    });
  };

  const updateOption = (index: number, value: string) => {
    if (!editingField) return;
    const newOptions = [...(editingField.options || [])];
    newOptions[index] = value;
    setEditingField({ ...editingField, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (!editingField) return;
    setEditingField({
      ...editingField,
      options: (editingField.options || []).filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-biat-primary dark:text-biat-accent">
            {isEditMode ? 'Modifier l\'événement' : 'Nouvel événement'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Créez un événement et personnalisez le formulaire d'inscription</p>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-biat-primary dark:text-biat-accent mb-4">Informations de base</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Titre <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Ex: Team Building 2024"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Décrivez l'événement..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date et heure <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Lieu
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Ex: Salle de conférence A"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        URL de l'image
                      </label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://example.com/image.jpg"
                      />
                      {imageUrl && (
                        <img src={imageUrl} alt="Preview" className="mt-2 h-32 rounded-lg object-cover" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Builder */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-biat-primary dark:text-biat-accent mb-4">Formulaire d'inscription</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Ajoutez des champs personnalisés pour collecter des informations auprès des participants
                  </p>

                  {formFields.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {formFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-biat-primary dark:hover:border-biat-accent transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {FIELD_TYPES.find(t => t.value === field.fieldType)?.icon}
                                </span>
                                <span className="font-medium dark:text-gray-200">{field.label}</span>
                                {field.required && <span className="text-red-500 dark:text-red-400 text-sm">*</span>}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {FIELD_TYPES.find(t => t.value === field.fieldType)?.label}
                                {field.options && ` - ${field.options.length} options`}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleMoveField(index, 'up')}
                                disabled={index === 0}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-biat-primary dark:hover:text-biat-accent disabled:opacity-30"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveField(index, 'down')}
                                disabled={index === formFields.length - 1}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-biat-primary dark:hover:text-biat-accent disabled:opacity-30"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditField(field)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteField(field.id!)}
                                className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {FIELD_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleAddField(type.value)}
                        className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-biat-primary dark:hover:border-biat-accent hover:bg-biat-50 dark:hover:bg-biat-primary/10 transition-colors text-left"
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sticky top-6">
                  <h3 className="text-lg font-bold text-biat-primary dark:text-biat-accent mb-4">Actions</h3>

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-biat-primary text-white px-4 py-3 rounded-lg hover:bg-biat-accent transition-colors font-semibold disabled:opacity-50"
                    >
                      {submitting ? 'Enregistrement...' : isEditMode ? 'Enregistrer' : 'Créer en brouillon'}
                    </button>

                    {!isEditMode && (
                      <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={submitting}
                        className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                      >
                        Créer et publier
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate('/evenements')}
                      className="w-full border border-gray-300 dark:border-gray-600 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors font-semibold"
                    >
                      Annuler
                    </button>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      💡 Les participants devront remplir le formulaire uniquement s'ils choisissent "Je participe"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Field Configuration Modal */}
      {showFieldConfig && editingField && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-biat-primary dark:text-biat-accent mb-6">
                Configuration du champ
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Label <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingField.label}
                    onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Ex: Taille de t-shirt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={editingField.placeholder || ''}
                    onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Texte d'aide..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingField.required}
                    onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                    className="w-4 h-4 text-biat-primary focus:ring-biat-primary rounded"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Champ obligatoire
                  </label>
                </div>

                {(editingField.fieldType === 'select' || editingField.fieldType === 'radio' || editingField.fieldType === 'checkbox') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Options <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <div className="space-y-2 mb-3">
                      {(editingField.options || []).map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder={`Option ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addOption}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-biat-primary dark:hover:border-biat-accent hover:bg-biat-50 dark:hover:bg-biat-primary/10 transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      + Ajouter une option
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleSaveField}
                  className="flex-1 bg-biat-primary text-white px-6 py-3 rounded-lg hover:bg-biat-accent transition-colors font-semibold"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingField(null);
                    setShowFieldConfig(false);
                  }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors font-semibold"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
