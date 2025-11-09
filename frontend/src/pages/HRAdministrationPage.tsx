import { useState } from 'react';
import AdminPage from './AdminPage';
import DocumentsPage from './DocumentsPage';
import TeamManagementPage from './TeamManagementPage';
import AuditPage from './AuditPage';
import UsersPage from './UsersPage';

type TabType = 'dashboard' | 'users' | 'documents' | 'teams' | 'audit';

export default function HRAdministrationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Tableau de bord', icon: '📊' },
    { id: 'users' as TabType, label: 'Utilisateurs', icon: '👤' },
    { id: 'documents' as TabType, label: 'Documents', icon: '📄' },
    { id: 'teams' as TabType, label: 'Équipes', icon: '👥' },
    { id: 'audit' as TabType, label: 'Audit', icon: '🔍' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Tabs Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-2xl md:text-3xl font-bold text-biat-primary dark:text-biat-300 mb-4">Administration</h1>
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
        {activeTab === 'dashboard' && (
          <div className="h-full">
            <AdminPage />
          </div>
        )}
        {activeTab === 'users' && (
          <div className="h-full">
            <UsersPage />
          </div>
        )}
        {activeTab === 'documents' && (
          <div className="h-full">
            <DocumentsPage />
          </div>
        )}
        {activeTab === 'teams' && (
          <div className="h-full">
            <TeamManagementPage />
          </div>
        )}
        {activeTab === 'audit' && (
          <div className="h-full">
            <AuditPage />
          </div>
        )}
      </div>
    </div>
  );
}
