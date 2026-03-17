import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmailChangeConfirmation } from "@steel-cut/steel-lib";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/email-change")({
  component: EmailChangePage,
});

function EmailChangePage() {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();

  const handleRefreshSession = async () => {
    await initialize();
  };

  const handleGoToProfile = () => {
    navigate({ to: "/profile", replace: true });
  };

  return (
    <EmailChangeConfirmation
      onRefreshSession={handleRefreshSession}
      onGoToProfile={handleGoToProfile}
    />
  );
}
