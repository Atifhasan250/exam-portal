import { createContext, useContext, useState, useEffect } from 'react';

const ThemeCtx = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    if (document.startViewTransition) {
      document.documentElement.style.setProperty('--tx', `${x}px`);
      document.documentElement.style.setProperty('--ty', `${y}px`);
      document.documentElement.style.setProperty('--tr', `${endRadius}px`);
      document.startViewTransition(() => setTheme(t => t === 'dark' ? 'light' : 'dark'));
    } else {
      setTheme(t => t === 'dark' ? 'light' : 'dark');
    }
  };

  return <ThemeCtx.Provider value={{ theme, toggleTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
