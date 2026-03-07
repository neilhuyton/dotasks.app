// src/app/components/GlobalIsFetchingIndicator.tsx

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function GlobalFetchingIndicator({
  timeoutMs = 15000,
}: {
  timeoutMs?: number;
}) {
  const fetchingCount = useIsFetching();
  const mutatingCount = useIsMutating();

  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const isActive = fetchingCount + mutatingCount > 0;
    if (isActive) {
      setShowSpinner(true);
      const timer = setTimeout(() => setShowSpinner(false), timeoutMs);
      return () => clearTimeout(timer);
    } else {
      setShowSpinner(false);
    }
  }, [fetchingCount, mutatingCount, timeoutMs]);

  if (!showSpinner) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5",
        "text-xs text-muted-foreground/80",
        "transition-opacity duration-300",
      )}
      title={`Syncing — ${fetchingCount} query / ${mutatingCount} mutation in progress`}
    >
      <Loader2
        data-testid="global-fetching-spinner"
        className="h-3.5 w-3.5 animate-spin"
      />
    </div>
  );
}
