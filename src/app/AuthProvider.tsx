import { useEffect, useState } from "react";
import { useAuthStore } from "@/shared/store/authStore";
import { Loader2 } from "lucide-react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, loading } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    initialize().finally(() => {
      setHydrated(true);
    });
  }, [initialize]);

  if (!hydrated || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
