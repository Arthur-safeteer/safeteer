// src/contexts/PrefsContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Prefs = {
  darkMode: boolean;
  timezone: string; // ex: "America/Sao_Paulo"
  setDarkMode: (v: boolean) => void;
  setTimezone: (tz: string) => void;
  resetPrefs: () => void;
};

const PrefsContext = createContext<Prefs | null>(null);

const LS_KEY = "prefs.v1";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePrefs(p: { darkMode: boolean; timezone: string }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {}
}

function clearPrefs() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

export const PrefsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Carrega preferências salvas ou usa padrões
  const saved = loadPrefs();
  const initial = saved || { darkMode: false, timezone: "America/Sao_Paulo" };
  const [darkMode, setDarkMode] = useState<boolean>(initial.darkMode);
  const [timezone, setTimezone] = useState<string>(initial.timezone);

  // aplica tema no <html data-theme="...">
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) html.setAttribute("data-theme", "dark");
    else html.removeAttribute("data-theme");
  }, [darkMode]);

  // persiste
  useEffect(() => {
    savePrefs({ darkMode, timezone });
  }, [darkMode, timezone]);

  const resetPrefs = () => {
    setDarkMode(false);
    setTimezone("America/Sao_Paulo");
    clearPrefs();
  };

  const value = useMemo(
    () => ({ darkMode, timezone, setDarkMode, setTimezone, resetPrefs }),
    [darkMode, timezone]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
};

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs precisa estar dentro de <PrefsProvider>");
  return ctx;
}
