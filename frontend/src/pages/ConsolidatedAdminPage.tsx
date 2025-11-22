import { useAuthStore } from '../store/authStore';
import HRAdministrationPage from './HRAdministrationPage';
import ITAdministrationPage from './ITAdministrationPage';

export default function ConsolidatedAdminPage() {
  const { user } = useAuthStore();
  const isHR = user?.role?.name === 'Gestionnaire RH' || user?.role?.name === 'Gestionnaire RH';
  const isITAdmin = user?.role?.name === 'IT Admin';

  if (isHR) {
    return <HRAdministrationPage />;
  } else if (isITAdmin) {
    return <ITAdministrationPage />;
  }

  // Fallback for unauthorized access
  return (
    <div className="flex items-center justify-center h-full dark:bg-gray-900">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">Accès non autorisé</h2>
        <p className="text-gray-500 dark:text-gray-400">Vous n'avez pas les permissions pour accéder à cette page.</p>
      </div>
    </div>
  );
}
