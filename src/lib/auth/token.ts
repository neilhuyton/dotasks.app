import { useAuthStore } from "@/store/authStore";
import { safeRefreshSession } from "@/lib/supabase-utils";

export const getAccessToken = async (): Promise<string | null> => {
  const { lastRefreshFailed, setLastRefreshFailed, signOut } =
    useAuthStore.getState();

  if (lastRefreshFailed) {
    return null;
  }

  const state = useAuthStore.getState();

  if (state.session?.access_token) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = state.session.expires_at ?? 0;

    if (expiresAt - now >= 120) {
      return state.session.access_token;
    }
  }

  try {
    const { data, error } = await safeRefreshSession();

    if (error || !data.session?.access_token) {
      setLastRefreshFailed(true);
      signOut?.();
      return null;
    }

    setLastRefreshFailed(false);
    return data.session.access_token;
  } catch {
    setLastRefreshFailed(true);
    signOut?.();
    return null;
  }
};
