// src/lib/theme-presets.ts

export type ColorTheme =
  | "zinc"
  | "blue"
  | "green"
  | "rose"
  | "violet"
  | "orange"
  | "red"
  | "yellow";

export const colorThemes: Record<
  ColorTheme,
  {
    name: string;
    primary: string;
    primaryForeground: string;
  }
> = {
  blue: {
    name: "Blue",
    primary: "oklch(0.62 0.18 250)",
    primaryForeground: "oklch(0.985 0 0)",
  },
  green: {
    name: "Green",
    primary: "oklch(0.62 0.15 160)",
    primaryForeground: "oklch(0.985 0 0)",
  },
  rose: {
    name: "Rose",
    primary: "oklch(0.65 0.22 350)",
    primaryForeground: "oklch(0.985 0 0)",
  },
  violet: {
    name: "Violet",
    primary: "oklch(0.58 0.22 280)",
    primaryForeground: "oklch(0.985 0 0)",
  },
  orange: {
    name: "Orange",
    primary: "oklch(0.68 0.22 60)",
    primaryForeground: "oklch(0.145 0 0)",
  },
  red: {
    name: "Red",
    primary: "oklch(0.62 0.24 25)",
    primaryForeground: "oklch(0.985 0 0)",
  },
  yellow: {
    name: "Yellow",
    primary: "oklch(0.78 0.18 80)",
    primaryForeground: "oklch(0.145 0 0)",
  },
};
