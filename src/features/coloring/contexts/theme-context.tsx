"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Theme = 'day' | 'night';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => Promise<void>;
  themeChanging: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('day');
  const [themeChanging, setThemeChanging] = useState(false);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Apply theme to document
    if (newTheme === 'night') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  };

  const toggleTheme = async () => {
    setThemeChanging(true);
    // Simulate loading delay for theme transition
    await new Promise(resolve => setTimeout(resolve, 300));
    const newTheme: Theme = theme === 'day' ? 'night' : 'day';
    setThemeState(newTheme);
    setTheme(newTheme);
    setThemeChanging(false);
  };

  // Apply theme on mount
  useEffect(() => {
    if (theme === 'night') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themeChanging }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
