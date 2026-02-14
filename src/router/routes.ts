// src/router/routes.ts

import { createRoute, redirect, type RootRoute } from "@tanstack/react-router";
import Home from "../pages/HomePage";
import RegisterPage from "../pages/RegisterPage";
import LoginPage from "../pages/LoginPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import ConfirmResetPasswordPage from "../pages/ConfirmResetPasswordPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import ProfilePage from "../pages/ProfilePage";
import { useAuthStore } from "@/store/authStore";
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

const checkAuth = async () => {
  const { isLoggedIn, refreshToken, accessToken, logout } =
    useAuthStore.getState();

  if (!isLoggedIn || !refreshToken) {
    console.debug("[checkAuth] No valid session → redirect to login");
    logout();
    throw redirect({ to: "/login", replace: true });
  }

  // Optional debug / early warning (do NOT logout here)
  if (accessToken) {
    try {
      const decoded = jwtDecode<DecodedToken>(accessToken);
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp < now - 30) {
        console.debug(
          "[checkAuth] Access token already expired → refresh link should handle",
        );
      }
    } catch (err) {
      console.debug(
        "[checkAuth] Invalid token format → refresh link will handle",
        err,
      );
    }
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

export const profileRoute = (rootRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/profile",
    beforeLoad: async () => {
      await checkAuth();
    },
    component: ProfilePage,
  });
