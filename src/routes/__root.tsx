import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { RouterContext } from "@/router";
import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { NotFound } from "@steel-cut/steel-lib";

function RootComponent() {
  const navigate = useNavigate();
  const hasHandledHash = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    if (hasHandledHash.current) return;

    if (
      hash.includes("type=email_change") ||
      hash.includes("message=Confirmation") ||
      hash.includes("error=")
    ) {
      hasHandledHash.current = true;
      navigate({
        to: "/email-change",
        replace: true,
        hash: hash,
      });
    }
  }, [navigate]);

  return <Outlet />;
}

function GlobalNotFound() {
  const navigate = useNavigate();

  return (
    <NotFound
      onHomeClick={() => navigate({ to: "/", replace: true })}
      onBackClick={() => window.history.back()}
    />
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: GlobalNotFound,
});
