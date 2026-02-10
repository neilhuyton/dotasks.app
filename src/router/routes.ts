// src/router/routes.ts
import { createRoute, redirect, type RootRoute } from "@tanstack/react-router";
import Home from "../pages/HomePage";
import WeightLogPage from "../pages/WeightLogPage";
import WeightChartPage from "../pages/WeightChartPage";
import WeightGoalPage from "../pages/WeightGoalPage";
import RegisterPage from "../pages/RegisterPage";
import LoginPage from "../pages/LoginPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import ConfirmResetPasswordPage from "../pages/ConfirmResetPasswordPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import ProfilePage from "../pages/ProfilePage";
import { useAuthStore } from "../store/authStore";
import {
  verifyEmailSearchSchema,
  confirmResetPasswordSearchSchema,
} from "../schemas";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Async auth check – ONLY validates, does NOT refresh
// Refresh is handled automatically by trpc-token-refresh-link before any protected request
const checkAuth = async () => {
  const { isLoggedIn, token, refreshToken, userId, logout } = useAuthStore.getState();

  if (!isLoggedIn || !token || !refreshToken || !userId) {
    logout();
    throw redirect({ to: "/login", replace: true });
  }

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = decoded.exp - now;

    // If expired or almost expired, let trpc link handle refresh on next real call
    // We allow a small buffer so page can still load
    if (secondsLeft < -30) {  // already expired more than 30s
      console.warn("[checkAuth] Token significantly expired — deferring to tRPC refresh link");
      // Do NOT logout here — link will attempt refresh and handle failure
    }

    // Token looks ok — proceed
    return;
  } catch (err) {
    console.warn("[checkAuth] Token decode failed", err);
    // Invalid token format — let tRPC link try refresh if possible
    // If refresh fails, link will trigger logout anyway
  }
};

export const homeRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: async () => {
      await checkAuth();
    },
    component: Home,
  });

export const registerRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/register",
    component: RegisterPage,
  });

export const loginRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: LoginPage,
  });

export const resetPasswordRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/reset-password",
    component: ResetPasswordPage,
  });

export const confirmResetPasswordRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/confirm-reset-password",
    validateSearch: confirmResetPasswordSearchSchema,
    component: ConfirmResetPasswordPage,
  });

export const verifyEmailRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/verify-email",
    validateSearch: verifyEmailSearchSchema,
    component: VerifyEmailPage,
  });

export const weightRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/weight",
    beforeLoad: async () => {
      await checkAuth();
    },
    component: WeightLogPage,
  });

export const weightChartRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/stats",
    beforeLoad: async () => {
      await checkAuth();
    },
    component: WeightChartPage,
  });

export const weightGoalRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/goals",
    beforeLoad: async () => {
      await checkAuth();
    },
    component: WeightGoalPage,
  });

export const profileRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/profile",
    beforeLoad: async () => {
      await checkAuth();
    },
    component: ProfilePage,
  });