import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Navigation
    'nav.chat': 'Chat',
    'nav.documents': 'Documents',
    'nav.admin': 'Admin',
    'nav.audit': 'Audit',
    'nav.users': 'Utilisateurs',
    'nav.system': 'Système',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',

    // Chat
    'chat.title': 'Assistant IA - Règlement Intérieur',
    'chat.subtitle': 'Posez vos questions sur le règlement intérieur d\'Assurances BIAT',
    'chat.placeholder': 'Posez votre question...',
    'chat.send': 'Envoyer',
    'chat.sending': 'Envoi...',
    'chat.newChat': 'Nouvelle conversation',
    'chat.search': 'Rechercher',
    'chat.history': 'Historique',

    // Documents
    'documents.title': 'Documents',
    'documents.upload': 'Télécharger un document',
    'documents.all': 'Tous',
    'documents.pending': 'En attente',
    'documents.approved': 'Approuvés',
    'documents.published': 'Publiés',

    // Settings
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Gérez vos informations personnelles et préférences',
    'settings.profile': 'Profil',
    'settings.password': 'Mot de passe',
    'settings.preferences': 'Préférences',
    'settings.save': 'Enregistrer',
    'settings.cancel': 'Annuler',

    // Preferences
    'pref.emailNotifications': 'Notifications par email',
    'pref.emailDesc': 'Recevoir des notifications pour les mises à jour importantes',
    'pref.chatHistory': 'Historique des conversations',
    'pref.chatHistoryDesc': 'Conserver l\'historique de vos conversations',
    'pref.theme': 'Thème',
    'pref.themeLight': 'Clair',
    'pref.themeLightDesc': 'Mode jour',
    'pref.themeDark': 'Sombre',
    'pref.themeDarkDesc': 'Mode nuit',
    'pref.language': 'Langue',

    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.yes': 'Oui',
    'common.no': 'Non',
  },
  ar: {
    // Navigation
    'nav.chat': 'الدردشة',
    'nav.documents': 'المستندات',
    'nav.admin': 'الإدارة',
    'nav.audit': 'التدقيق',
    'nav.users': 'المستخدمون',
    'nav.system': 'النظام',
    'nav.settings': 'الإعدادات',
    'nav.logout': 'تسجيل الخروج',

    // Chat
    'chat.title': 'مساعد الذكاء الاصطناعي - اللوائح الداخلية',
    'chat.subtitle': 'اطرح أسئلتك حول اللوائح الداخلية لـ Assurances BIAT',
    'chat.placeholder': 'اطرح سؤالك...',
    'chat.send': 'إرسال',
    'chat.sending': 'جاري الإرسال...',
    'chat.newChat': 'محادثة جديدة',
    'chat.search': 'بحث',
    'chat.history': 'السجل',

    // Documents
    'documents.title': 'المستندات',
    'documents.upload': 'تحميل مستند',
    'documents.all': 'الكل',
    'documents.pending': 'قيد الانتظار',
    'documents.approved': 'موافق عليها',
    'documents.published': 'منشورة',

    // Settings
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'إدارة معلوماتك الشخصية والتفضيلات',
    'settings.profile': 'الملف الشخصي',
    'settings.password': 'كلمة المرور',
    'settings.preferences': 'التفضيلات',
    'settings.save': 'حفظ',
    'settings.cancel': 'إلغاء',

    // Preferences
    'pref.emailNotifications': 'إشعارات البريد الإلكتروني',
    'pref.emailDesc': 'تلقي إشعارات للتحديثات المهمة',
    'pref.chatHistory': 'سجل المحادثات',
    'pref.chatHistoryDesc': 'الاحتفاظ بسجل محادثاتك',
    'pref.theme': 'المظهر',
    'pref.themeLight': 'فاتح',
    'pref.themeLightDesc': 'وضع النهار',
    'pref.themeDark': 'داكن',
    'pref.themeDarkDesc': 'وضع الليل',
    'pref.language': 'اللغة',

    // Common
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجاح',
    'common.yes': 'نعم',
    'common.no': 'لا',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    // Load language from localStorage
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences);
        if (prefs.language) {
          setLanguageState(prefs.language);
          applyLanguage(prefs.language);
        }
      } catch (error) {
        console.error('Failed to parse preferences:', error);
      }
    }
  }, []);

  const applyLanguage = (newLanguage: Language) => {
    const root = document.documentElement;
    root.setAttribute('lang', newLanguage);
    root.setAttribute('dir', newLanguage === 'ar' ? 'rtl' : 'ltr');
  };

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    applyLanguage(newLanguage);

    // Update localStorage
    const savedPreferences = localStorage.getItem('userPreferences');
    let prefs = { language: newLanguage };
    if (savedPreferences) {
      try {
        prefs = { ...JSON.parse(savedPreferences), language: newLanguage };
      } catch (error) {
        console.error('Failed to parse preferences:', error);
      }
    }
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
