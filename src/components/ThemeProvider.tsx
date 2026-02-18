// src/components/ThemeProvider.tsx

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import type { ThemeProviderProps as NextThemeProviderProps } from "next-themes";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: string;
  storageKey?: string;
  enableSystem?: boolean;
} & Omit<
  NextThemeProviderProps,
  "children" | "defaultTheme" | "storageKey" | "enableSystem"
>;

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "vite-ui-theme",
  enableSystem = true,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      enableSystem={enableSystem}
      {...props}
    >
      {children}
    </NextThemeProvider>
  );
}
