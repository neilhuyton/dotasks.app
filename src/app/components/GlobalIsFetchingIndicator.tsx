// src/app/components/GlobalIsFetchingIndicator.tsx

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

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
      )}
      title={`Syncing — ${fetchingCount} query / ${mutatingCount} mutation in progress`}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    </div>
  );
}
