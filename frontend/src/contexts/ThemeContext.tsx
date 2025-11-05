import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // Load theme from localStorage
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences);
        if (prefs.theme) {
          setThemeState(prefs.theme);
          applyTheme(prefs.theme);
        }
      } catch (error) {
        console.error('Failed to parse preferences:', error);
      }
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Update localStorage
    const savedPreferences = localStorage.getItem('userPreferences');
    let prefs = { theme: newTheme };
    if (savedPreferences) {
      try {
        prefs = { ...JSON.parse(savedPreferences), theme: newTheme };
      } catch (error) {
        console.error('Failed to parse preferences:', error);
      }
    }
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
