// src/app/components/LogoutSection.tsx

import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/store/authStore";
import { supabase } from "@/lib/supabase";
import { useBannerStore } from "@/shared/store/bannerStore";
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
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutSection() {
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const handleLogout = async () => {
    try {
      const key = "sb-gmkfhkydrxmgynzhviip-auth-token";
      localStorage.removeItem(key);

      useAuthStore.setState({
        session: null,
        user: null,
        loading: false,
        error: null,
      });

      await supabase.auth.signOut();

      localStorage.removeItem(key);
      queryClient.clear();

      window.location.replace("/login");
    } catch {
      showBanner({
        message: "Logout failed – please try again",
        variant: "error",
        duration: 4000,
      });
    }
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
