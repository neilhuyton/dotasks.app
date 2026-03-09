// src/components/ui/task-checkbox.tsx

"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const TaskCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-6 w-6 shrink-0 rounded cursor-pointer transition-all duration-150",
      // Base border — we make it fainter for unchecked
      "border border-muted-foreground/30", // ← fainter base
      "data-[state=unchecked]:border-muted-foreground/35", // even fainter unchecked
      "data-[state=unchecked]:bg-muted/5 data-[state=unchecked]:hover:bg-muted/20",
      // Checked: full-strength border + bg
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-sm",
      // Focus ring stays strong
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    checked={checked}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center h-full w-full")}
      forceMount
    >
      <Check
        className={cn(
          "h-4 w-4 stroke-[2.8]",
          checked
            ? "opacity-100 text-primary-foreground"
            : "opacity-30 text-muted-foreground",
        )}
      />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
TaskCheckbox.displayName = "TaskCheckbox";

export { TaskCheckbox };
