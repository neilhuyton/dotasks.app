// src/components/FabButton.tsx

import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

interface FabButtonProps
  extends Omit<ComponentProps<typeof Button>, "children" | "asChild"> {
  to: string;
  params?: Record<string, string>;
  label: string;
  testId?: string;
}

export function FabButton({
  to,
  params,
  label,
  testId,
  ...buttonProps
}: FabButtonProps) {
  return (
    <Button
      asChild
      size="lg"
      className={`
        fixed bottom-20 right-4 z-50
        rounded-full w-14 h-14
        shadow-xl hover:shadow-2xl
        transition-all duration-200 hover:scale-110
        bg-primary hover:bg-primary/90
        text-primary-foreground
        flex items-center justify-center
        md:bottom-16 md:right-10 md:w-16 md:h-16
      `}
      data-testid={testId}
      {...buttonProps}
    >
      <Link to={to} params={params}>
        <Plus className="h-7 w-7 md:h-8 md:w-8" />
        <span className="sr-only">{label}</span>
      </Link>
    </Button>
  );
}