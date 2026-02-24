// src/components/GlobalFetchingIndicator.tsx

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"; // ← assuming you have a cn utility (clsx + tailwind-merge)

export function GlobalFetchingIndicator() {
  const fetchingCount = useIsFetching();
  const mutatingCount = useIsMutating();

  const isAnyActivity = fetchingCount + mutatingCount > 0;

  if (!isAnyActivity) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5",
        "text-xs text-muted-foreground/80",
        "transition-opacity duration-300",
        // subtle animation when appearing/disappearing
      )}
      title={`Syncing — ${fetchingCount} query / ${mutatingCount} mutation in progress`}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span className="hidden sm:inline">Updating…</span>
    </div>
  );
}