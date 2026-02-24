// src/components/ColorThemeToggle.tsx

import { useColorTheme } from "@/hooks/useColorTheme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Paintbrush } from "lucide-react";
import { colorThemes } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";

export function ColorThemeToggle() {
  const { colorTheme, setColorTheme } = useColorTheme();

  type ColorThemeKey = keyof typeof colorThemes;

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
              h-2.5 w-2.5            // was h-3 w-3
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
        {(Object.keys(colorThemes) as ColorThemeKey[]).map((key) => {
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
