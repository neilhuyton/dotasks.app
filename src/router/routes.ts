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

const checkAuth = () => {
  const { isLoggedIn, token } = useAuthStore.getState();
  if (!isLoggedIn || !token) {
    throw redirect({ to: "/login" });
  }
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return false; // Let trpcClient handle refresh
    }
    return true;
  } catch {
    throw redirect({ to: "/login" });
  }
};

export const homeRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: () => {
      if (!checkAuth()) {
        return; // Allow trpcClient to attempt refresh
      }
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

export const weightRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/weight",
    beforeLoad: () => {
      if (!checkAuth()) {
        return; // Allow trpcClient to attempt refresh
      }
    },
    component: WeightLogPage,
  });

export const weightChartRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/stats",
    beforeLoad: () => {
      if (!checkAuth()) {
        return; // Allow trpcClient to attempt refresh
      }
    },
    component: WeightChartPage,
  });

export const weightGoalRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/goals",
    beforeLoad: () => {
      if (!checkAuth()) {
        return; // Allow trpcClient to attempt refresh
      }
    },
    component: WeightGoalPage,
  });

export const verifyEmailRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/verify-email",
    validateSearch: verifyEmailSearchSchema,
    component: VerifyEmailPage,
  });

export const profileRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/profile",
    beforeLoad: () => {
      if (!checkAuth()) {
        return; // Allow trpcClient to attempt refresh
      }
    },
    component: ProfilePage,
  });
