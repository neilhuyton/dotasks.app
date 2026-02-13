// src/hooks/useColorTheme.ts

import { useEffect, useState } from "react";
import { type ColorTheme, colorThemes } from "@/lib/theme-presets";

const STORAGE_KEY = "app-color-theme";

export function useColorTheme() {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    return saved && colorThemes[saved] ? saved : "zinc";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, colorTheme);

    // Apply to document (we'll use data-color-theme attribute)
    document.documentElement.setAttribute("data-color-theme", colorTheme);
  }, [colorTheme]);

  return {
    colorTheme,
    setColorTheme,
    current: colorThemes[colorTheme],
  };
}
