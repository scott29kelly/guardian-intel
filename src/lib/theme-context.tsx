"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "slate" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Migrate from old storage key
    const oldTheme = localStorage.getItem("guardian-theme");
    if (oldTheme) {
      localStorage.removeItem("guardian-theme");
      localStorage.setItem("tradepulse-theme", oldTheme);
    }

    const storedTheme = localStorage.getItem("tradepulse-theme");

    if (storedTheme && ["dark", "slate", "light"].includes(storedTheme)) {
      setTheme(storedTheme as Theme);
    } else if (storedTheme === "gray" || storedTheme === "light-gray") {
      // Migrate old theme names
      setTheme("slate");
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("tradepulse-theme", theme);
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
