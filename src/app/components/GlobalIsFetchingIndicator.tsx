// src/app/components/GlobalIsFetchingIndicator.tsx

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function GlobalFetchingIndicator() {
  const fetchingCount = useIsFetching();
  const mutatingCount = useIsMutating();

  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const isActive = fetchingCount + mutatingCount > 0;
    if (isActive) {
      setShowSpinner(true);
      const timer = setTimeout(() => setShowSpinner(false), 15000); // force hide after 15s if stuck
      return () => clearTimeout(timer);
    } else {
      setShowSpinner(false);
    }
  }, [fetchingCount, mutatingCount]);

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
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    </div>
  );
}