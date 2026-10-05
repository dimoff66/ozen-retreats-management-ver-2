'use client';

import { useEffect } from "react";

const storageKey = "ozen-ui-font-level";
const minFontLevel = 0;
const maxFontLevel = 6;

const clampFontLevel = (value: number) => {
  return Math.min(maxFontLevel, Math.max(minFontLevel, value));
};

const applyFontLevel = (level: number) => {
  document.documentElement.dataset.uiFontLevel = String(level);
};

export default function FontSizeHotkeys() {
  useEffect(() => {
    let fontLevel = minFontLevel;

    try {
      const storedFontLevel = Number.parseInt(localStorage.getItem(storageKey) ?? "", 10);

      if (Number.isFinite(storedFontLevel)) {
        fontLevel = clampFontLevel(storedFontLevel);
      }
    } catch {
      fontLevel = minFontLevel;
    }

    applyFontLevel(fontLevel);

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
        ? clampFontLevel(fontLevel + 1)
        : clampFontLevel(fontLevel - 1);

      if (nextFontLevel === fontLevel) {
        return;
      }

      event.preventDefault();
      fontLevel = nextFontLevel;
      applyFontLevel(fontLevel);

      try {
        localStorage.setItem(storageKey, String(fontLevel));
      } catch {
        // The preference still works for the current session if storage is unavailable.
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
