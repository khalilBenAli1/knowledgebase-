import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string) => void;
  label?: string;
}

export default function ImageUpload({ currentImageUrl, onImageChange, label = "Image" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl || '');
  const [useUrl, setUseUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(currentImageUrl || '');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non supporté. Utilisez JPEG, PNG, GIF ou WebP.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux. Taille maximale: 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.loading('Téléchargement de l\'image...', { id: 'upload' });

      const response = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = response.data.imageUrl;
      setPreviewUrl(imageUrl);
      onImageChange(imageUrl);
      toast.success('Image téléchargée avec succès!', { id: 'upload' });
    } catch (error: any) {
      console.error('Failed to upload image', error);
      toast.error(error.response?.data?.message || 'Erreur lors du téléchargement', { id: 'upload' });
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast.error('Veuillez entrer une URL');
      return;
    }

    try {
      new URL(urlInput); // Validate URL format
      setPreviewUrl(urlInput);
      onImageChange(urlInput);
      toast.success('URL de l\'image ajoutée!');
    } catch {
      toast.error('URL invalide');
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    setUrlInput('');
    onImageChange('');
    toast.success('Image supprimée');
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {/* Toggle between file upload and URL */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setUseUrl(false)}
          className={`flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
            !useUrl
              ? 'border-biat-primary bg-biat-50 dark:bg-biat-900/30 text-biat-primary dark:text-biat-300 font-semibold'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          📁 Télécharger un fichier
        </button>
        <button
          type="button"
          onClick={() => setUseUrl(true)}
          className={`flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
            useUrl
              ? 'border-biat-primary bg-biat-50 dark:bg-biat-900/30 text-biat-primary dark:text-biat-300 font-semibold'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          🔗 Utiliser une URL
        </button>
      </div>

      {!useUrl ? (
        /* File Upload */
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-biat-primary dark:hover:border-biat-300 transition-colors">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {uploading ? 'Téléchargement...' : 'Cliquez pour sélectionner une image'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              JPEG, PNG, GIF ou WebP (max 5MB)
            </p>
          </label>
        </div>
      ) : (
        /* URL Input */
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-4 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors"
          >
            Ajouter
          </button>
        </div>
      )}

      {/* Image Preview */}
      {previewUrl && (
        <div className="relative mt-4 inline-block">
          <img
            src={previewUrl}
            alt="Preview"
            className="h-40 rounded-lg object-cover border-2 border-gray-300 dark:border-gray-600"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage non disponible%3C/text%3E%3C/svg%3E';
            }}
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            title="Supprimer l'image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
