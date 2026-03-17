import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import type { RouterContext } from "@/router";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Navigation, NotFound } from "@steel-cut/steel-lib";
import { APP_CONFIG } from "@/appConfig";

function RootComponent() {
  const isLoggedIn = useAuthStore((state) => !!state.user);
  const navigate = useNavigate();
  const hasHandledHash = useRef(false);
  const { pathname } = useLocation();

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

  return (
    <>
      {isLoggedIn && APP_CONFIG.navItems && (
        <Navigation
          items={APP_CONFIG.navItems}
          LinkComponent={(props) => (
            <Link
              {...props}
              activeProps={{
                className:
                  "font-semibold bg-muted before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-primary",
              }}
              aria-current={pathname === props.to ? "page" : undefined}
            />
          )}
        />
      )}
      <Outlet />
    </>
  );
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
