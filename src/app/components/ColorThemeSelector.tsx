// src/app/components/ColorThemeSelector.tsx

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Paintbrush } from "lucide-react";
import { colorThemes } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";

type ColorTheme = keyof typeof colorThemes;

const STORAGE_KEY = "app-color-theme";

export function ColorThemeSelector() {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    return saved && colorThemes[saved] ? saved : "blue";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, colorTheme);
    document.documentElement.setAttribute("data-color-theme", colorTheme);
  }, [colorTheme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="
            h-8 w-8
            p-0
            border-border/70
            hover:bg-muted/80
            relative
          "
        >
          <Paintbrush className="h-4 w-4" />

          <span
            className="
              absolute -bottom-0.5 -right-0.5
              h-2.5 w-2.5
              rounded-full
              border border-background
              shadow-sm
              bg-[var(--primary)]
            "
          />

          <span className="sr-only">Toggle color theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 max-h-[min(70vh,400px)] overflow-y-auto"
      >
        {(Object.keys(colorThemes) as ColorTheme[]).map((key) => {
          const theme = colorThemes[key];
          const isActive = colorTheme === key;

          return (
            <DropdownMenuItem
              key={key}
              onClick={() => setColorTheme(key)}
              className={cn(
                "cursor-pointer flex items-center gap-3 py-2.5",
                isActive && "bg-accent",
              )}
            >
              <div
                className="h-5 w-5 rounded-full border border-border shrink-0 shadow-sm"
                style={{ backgroundColor: theme.primary }}
              />
              <span className="font-medium">{theme.name}</span>

              {isActive && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Active
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
