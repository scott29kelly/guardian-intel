"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "slate" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("guardian-theme") as Theme;
    
    if (storedTheme && ["dark", "slate", "light"].includes(storedTheme)) {
      setTheme(storedTheme);
    } else if (storedTheme === "gray" || storedTheme === "light-gray") {
      setTheme("slate");
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("guardian-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
