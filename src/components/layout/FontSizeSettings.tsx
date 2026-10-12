'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

const storageKey = "project-ui-font-level";
export const minFontLevel = 0;
export const maxFontLevel = 6;

type FontSizeSettingsContextValue = {
  fontLevel: number;
  setFontLevel: (level: number) => void;
};

type FontSizeSettingsProviderProps = {
  children: ReactNode;
};

const FontSizeSettingsContext = createContext<FontSizeSettingsContextValue | null>(null);

const clampFontLevel = (value: number) => {
  return Math.min(maxFontLevel, Math.max(minFontLevel, value));
};

const applyFontLevel = (level: number) => {
  document.documentElement.dataset.uiFontLevel = String(level);
};

const getStoredFontLevel = () => {
  if (typeof window === "undefined") {
    return minFontLevel;
  }

  try {
    const storedValue = Number.parseInt(localStorage.getItem(storageKey) ?? "", 10);

    return Number.isFinite(storedValue) ? clampFontLevel(storedValue) : minFontLevel;
  } catch {
    return minFontLevel;
  }
};

export function FontSizeSettingsProvider({
  children,
}: FontSizeSettingsProviderProps) {
  const [fontLevel, setFontLevelState] = useState(getStoredFontLevel);
  const fontLevelRef = useRef(fontLevel);

  const setFontLevel = useCallback((level: number) => {
    const nextFontLevel = clampFontLevel(level);
    fontLevelRef.current = nextFontLevel;
    setFontLevelState(nextFontLevel);
    applyFontLevel(nextFontLevel);

    try {
      localStorage.setItem(storageKey, String(nextFontLevel));
    } catch {
      // The preference still works for the current session if storage is unavailable.
    }
  }, []);

  useEffect(() => {
    applyFontLevel(fontLevelRef.current);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const isIncrease = event.key === "+" || event.code === "Equal" || event.code === "NumpadAdd";
      const isDecrease = event.key === "-" || event.code === "Minus" || event.code === "NumpadSubtract";

      if (!isIncrease && !isDecrease) {
        return;
      }

      const nextFontLevel = isIncrease
        ? clampFontLevel(fontLevelRef.current + 1)
        : clampFontLevel(fontLevelRef.current - 1);

      if (nextFontLevel === fontLevelRef.current) {
        return;
      }

      event.preventDefault();
      setFontLevel(nextFontLevel);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [setFontLevel]);

  const value: FontSizeSettingsContextValue = {
    fontLevel,
    setFontLevel,
  };

  return (
    <FontSizeSettingsContext.Provider value={value}>
      {children}
    </FontSizeSettingsContext.Provider>
  );
}

export function useFontSizeSettings(): FontSizeSettingsContextValue {
  const context = useContext(FontSizeSettingsContext);

  if (!context) {
    throw new Error("useFontSizeSettings must be used inside FontSizeSettingsProvider.");
  }

  return context;
}
