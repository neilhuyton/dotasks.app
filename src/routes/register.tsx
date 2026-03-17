import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { useAuthStore } from "@/store/authStore";
import { RegisterForm, type RegisterFormValues } from "@steel-cut/steel-lib";
import { useState } from "react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = Route.useNavigate();
  const { signUp } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (values: RegisterFormValues) => {
    setIsLoading(true);

    try {
      const { error } = await signUp(values.email, values.password);

      if (error) {
        return { error: { message: error.message ?? "Registration failed" } };
      }

      setTimeout(() => {
        navigate({ to: "/login" });
      }, 2200);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center p-1 sm:p-2 lg:p-3">
      <div className="pt-14">
        <Logo />
      </div>

      <RegisterForm
        onSubmit={handleRegister}
        onLogin={() => navigate({ to: "/login" })}
        isLoading={isLoading}
        className="mt-16 sm:mt-20"
      />
    </div>
  );
}
