import { useState, useCallback } from "react";

const PREFS_KEY = "awardhunter_prefs";
const DEFAULT_PREFS = { alliances: [], cards: [], programs: [] };

export function usePreferences() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });

  const updatePrefs = useCallback((updates) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearPrefs = useCallback(() => {
    try { localStorage.removeItem(PREFS_KEY); } catch {}
    setPrefs(DEFAULT_PREFS);
  }, []);

  const hasPrefs = prefs.alliances.length > 0 || prefs.cards.length > 0 || prefs.programs.length > 0;

  return { prefs, updatePrefs, clearPrefs, hasPrefs };
}
