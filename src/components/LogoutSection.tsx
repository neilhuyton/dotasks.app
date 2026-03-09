// src/app/components/LogoutSection.tsx

import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutSection() {
  const queryClient = useQueryClient();
  const { signOut } = useAuthStore();

  const handleLogout = () => {
    // 1. Start signOut but DO NOT await — prevents browser freeze if Supabase deadlocks
    signOut().catch((err) =>
      console.warn("[Logout] supabase.auth.signOut failed (non-blocking)", err),
    );

    // 2. Immediately clean local state & storage (critical)
    const ref = new URL(import.meta.env.VITE_SUPABASE_URL!).hostname.split(
      ".",
    )[0];
    localStorage.removeItem(`sb-${ref}-auth-token`);

    // Also remove any other supabase-related keys that might linger
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.includes("-auth"))
      .forEach((key) => localStorage.removeItem(key));

    // 3. Clear all queries & cache
    queryClient.clear();

    // 4. Force navigation — this is what actually gets the user out
    window.location.replace("/login");
  };

  return (
    <section className="pt-12 border-t flex justify-center">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            className="w-full sm:w-auto px-6 gap-2"
            data-testid="logout-button"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to log out?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
