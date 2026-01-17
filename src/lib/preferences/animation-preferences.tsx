"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface AnimationPreferences {
  // Master toggle for reduced motion
  reducedMotion: boolean;
  
  // Granular controls
  showConfetti: boolean;
  showCelebrations: boolean;
  showXPNotifications: boolean;
  animateCounters: boolean;
  showStreakAnimations: boolean;
  showLeaderboard: boolean;
  
  // Sound (for future use)
  enableSounds: boolean;
}

const DEFAULT_PREFERENCES: AnimationPreferences = {
  reducedMotion: false,
  showConfetti: true,
  showCelebrations: true,
  showXPNotifications: true,
  animateCounters: true,
  showStreakAnimations: true,
  showLeaderboard: true,
  enableSounds: false,
};

interface AnimationPreferencesContextType {
  preferences: AnimationPreferences;
  updatePreference: <K extends keyof AnimationPreferences>(key: K, value: AnimationPreferences[K]) => void;
  setReducedMotion: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const AnimationPreferencesContext = createContext<AnimationPreferencesContextType | undefined>(undefined);

const STORAGE_KEY = "guardian-animation-preferences";

export function AnimationPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AnimationPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
      
      // Also check system preference for reduced motion
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches && !stored) {
        setPreferences(prev => ({ ...prev, reducedMotion: true }));
      }
      
      // Listen for system preference changes
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          setPreferences(prev => ({ ...prev, reducedMotion: true }));
        }
      };
      mediaQuery.addEventListener("change", handleChange);
      
      setIsLoaded(true);
      
      return () => mediaQuery.removeEventListener("change", handleChange);
    } catch (e) {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (e) {
        // Storage might be full or unavailable
      }
    }
  }, [preferences, isLoaded]);

  const updatePreference = useCallback(<K extends keyof AnimationPreferences>(
    key: K, 
    value: AnimationPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const setReducedMotion = useCallback((enabled: boolean) => {
    if (enabled) {
      // When enabling reduced motion, turn off all animations
      setPreferences({
        reducedMotion: true,
        showConfetti: false,
        showCelebrations: false,
        showXPNotifications: false,
        animateCounters: false,
        showStreakAnimations: false,
        showLeaderboard: true, // Keep leaderboard visible, just no animations
        enableSounds: false,
      });
    } else {
      // When disabling, restore defaults
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return (
    <AnimationPreferencesContext.Provider
      value={{
        preferences,
        updatePreference,
        setReducedMotion,
        resetToDefaults,
      }}
    >
      {children}
    </AnimationPreferencesContext.Provider>
  );
}

export function useAnimationPreferences() {
  const context = useContext(AnimationPreferencesContext);
  if (context === undefined) {
    throw new Error("useAnimationPreferences must be used within an AnimationPreferencesProvider");
  }
  return context;
}

// Hook for checking if animations should be shown
export function useShouldAnimate() {
  const { preferences } = useAnimationPreferences();
  
  return {
    shouldShowConfetti: !preferences.reducedMotion && preferences.showConfetti,
    shouldShowCelebrations: !preferences.reducedMotion && preferences.showCelebrations,
    shouldShowXP: !preferences.reducedMotion && preferences.showXPNotifications,
    shouldAnimateCounters: !preferences.reducedMotion && preferences.animateCounters,
    shouldShowStreakAnimations: !preferences.reducedMotion && preferences.showStreakAnimations,
    shouldShowLeaderboard: preferences.showLeaderboard,
    isReducedMotion: preferences.reducedMotion,
  };
}
