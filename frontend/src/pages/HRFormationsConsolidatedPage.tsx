import { useState } from 'react';
import FormationsPage from './FormationsPage';
import MyFormationRequestsPage from './MyFormationRequestsPage';
import HRCatalogUploadPage from './HRCatalogUploadPage';
import HRFormationRequestsPage from './HRFormationRequestsPage';
import { useAuthStore } from '../store/authStore';

type TabType = 'catalogue' | 'mes-demandes' | 'gestion-catalogue' | 'toutes-demandes';

export default function HRFormationsConsolidatedPage() {
  const { user } = useAuthStore();
  const isHR = user?.role?.name === 'Gestionnaire RH' || user?.role?.name === 'Gestionnaire RH';

  const [activeTab, setActiveTab] = useState<TabType>('catalogue');

  const tabs = [
    { id: 'catalogue' as TabType, label: 'Catalogue', icon: '📚' },
    { id: 'mes-demandes' as TabType, label: 'Mes Demandes', icon: '📝' },
    ...(isHR ? [
      { id: 'gestion-catalogue' as TabType, label: 'Gestion Catalogue', icon: '⚙️' },
      { id: 'toutes-demandes' as TabType, label: 'Toutes les Demandes', icon: '📋' },
    ] : []),
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Tabs Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-2xl md:text-3xl font-bold text-biat-primary dark:text-biat-300 mb-4">Formations</h1>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-biat-primary text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm md:text-base">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'catalogue' && <FormationsPage />}
        {activeTab === 'mes-demandes' && <MyFormationRequestsPage />}
        {activeTab === 'gestion-catalogue' && isHR && <HRCatalogUploadPage />}
        {activeTab === 'toutes-demandes' && isHR && <HRFormationRequestsPage />}
      </div>
    </div>
  );
}
