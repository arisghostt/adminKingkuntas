'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

// Function to determine auto theme based on time of day (client-side only)
function getAutoTheme(): Theme {
  const hour = new Date().getHours();
  // Auto theme: light during day (6 AM - 6 PM), dark at night
  return (hour >= 6 && hour < 18) ? 'light' : 'dark';
}

// Apply theme to document element
function applyThemeToDocument(theme: Theme): void {
  // Only apply if window is available (client-side)
  if (typeof window === 'undefined') return;
  
  const resolvedTheme = theme === 'auto' ? getAutoTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Track whether the component has mounted on the client
  const [mounted, setMounted] = useState(false);
  
  // Initialize with a consistent default value to avoid hydration mismatch
  // Both server and client start with 'light', then sync with localStorage after mount
  const [theme, setTheme] = useState<Theme>('light');

  // Effect: initialize theme, apply to document, and mark as mounted
  useEffect(() => {
    // Read saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    // Determine the theme to use
    let resolvedTheme: Theme;
    if (savedTheme) {
      resolvedTheme = savedTheme;
    } else {
      // Default to auto theme on first load
      resolvedTheme = 'auto';
    }
    
    // Apply the resolved theme to state and document
    setTheme(resolvedTheme);
    applyThemeToDocument(resolvedTheme);
    localStorage.setItem('theme', resolvedTheme);
    
    // Mark as mounted
    setMounted(true);
  }, []);

  // Effect to apply theme changes to document
  useEffect(() => {
    if (!mounted) return;
    
    applyThemeToDocument(theme);
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      if (prevTheme === 'auto') return 'light';
      if (prevTheme === 'light') return 'dark';
      return 'auto';
    });
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme,
    mounted
  }), [theme, mounted]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

