// src/app/components/ThemeToggle.tsx

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="
            h-8 w-8               // smaller overall button (was default ~10x10)
            p-0                   // remove extra padding inside button
            border-border/70      // slightly softer border (optional, looks cleaner when small)
            hover:bg-muted/80
          "
          data-testid="theme-toggle"
        >
          <Sun
            className="
              h-4 w-4               // smaller icon (was 1.2rem ≈19px)
              rotate-0 scale-100 
              transition-all 
              dark:-rotate-90 dark:scale-0
            "
          />
          <Moon
            className="
              absolute 
              h-4 w-4               // same size as Sun
              rotate-90 scale-0 
              transition-all 
              dark:rotate-0 dark:scale-100
            "
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
