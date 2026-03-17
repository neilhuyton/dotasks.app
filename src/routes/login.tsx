import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LoginForm, type LoginFormValues } from "@steel-cut/steel-lib";
import { APP_CONFIG } from "@/appConfig";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await useAuthStore.getState().waitUntilReady();

    if (session?.user?.id) {
      throw redirect({
        to: APP_CONFIG.defaultAuthenticatedPath,
        replace: true,
      });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      useAuthStore.getState().isInitialized &&
      useAuthStore.getState().session?.user?.id
    ) {
      navigate({ to: APP_CONFIG.defaultAuthenticatedPath, replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);

    try {
      const { error } = await signIn(values.email, values.password);

      if (error) {
        return { error };
      }

      navigate({ to: APP_CONFIG.defaultAuthenticatedPath });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3">
      <div className="w-full max-w-md bg-background rounded-lg p-4 flex flex-col items-center mt-16 sm:mt-20">
        <LoginForm
          onSubmit={handleSubmit}
          onForgotPassword={() => navigate({ to: "/reset-password" })}
          onSignUp={() => navigate({ to: "/register" })}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
