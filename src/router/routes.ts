// src/router/routes.ts

import { createRoute, redirect } from "@tanstack/react-router";

// Pages
import RegisterPage from "@/pages/RegisterPage";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ConfirmResetPasswordPage from "@/pages/ConfirmResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import ProfilePage from "@/pages/ProfilePage";
import ListsPage from "@/pages/ListsPage";
import ListDetailPage from "@/pages/ListDetailPage";

// Layout & root
import { rootRoute } from "./rootRoute";
import { authenticatedRoute } from "./_authenticated";
import NewTaskModalPage from "@/pages/modals/NewTaskModalPage";
import CreateListModalPage from "@/pages/modals/CreateListModalPage";
import DeleteListConfirmModalPage from "@/pages/modals/DeleteListConfirmModalPage";
import DeleteTaskConfirmModalPage from "@/pages/modals/DeleteTaskConfirmModalPage"; // ← NEW

// ─── PUBLIC ROUTES ─────────────────────────────────────────────────

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

export const confirmResetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/confirm-reset-password",
  component: ConfirmResetPasswordPage,
});

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  component: VerifyEmailPage,
});

// ─── PROTECTED ROUTES ──────────────────────────────────────────────

export const homeRedirectRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  loader: () => {
    throw redirect({ to: "/lists" as const, replace: true });
  },
});

// ─── Lists section ─────────────────────────────────────────────────

export const listsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "lists",
});

export const listsIndexRoute = createRoute({
  getParentRoute: () => listsRoute,
  path: "/",
  component: ListsPage,
});

export const createListRoute = createRoute({
  getParentRoute: () => listsRoute,
  path: "new",
  component: CreateListModalPage,
});

export const listDetailRoute = createRoute({
  getParentRoute: () => listsRoute,
  path: "$listId",
  parseParams: (params) => {
    return { listId: params.listId };
  },
  stringifyParams: ({ listId }) => ({ listId }),
  component: ListDetailPage,
});

export const createTaskRoute = createRoute({
  getParentRoute: () => listDetailRoute,
  path: "tasks/new",
  component: NewTaskModalPage,
});

export const deleteListRoute = createRoute({
  getParentRoute: () => listDetailRoute,
  path: "delete",
  component: DeleteListConfirmModalPage,
});

export const deleteTaskRoute = createRoute({
  getParentRoute: () => listDetailRoute,
  path: "tasks/$taskId/delete", // or "tasks/delete/$taskId" — both fine
  parseParams: (params) => ({ taskId: params.taskId }),
  stringifyParams: ({ taskId }) => ({ taskId }),
  component: DeleteTaskConfirmModalPage,
});

export const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "profile",
  component: ProfilePage,
});

// ─── Route tree ─────────────────────────────────────────────────────

export const protectedRoutes = authenticatedRoute.addChildren([
  homeRedirectRoute,
  listsRoute.addChildren([
    listsIndexRoute,
    createListRoute,
    listDetailRoute.addChildren([
      createTaskRoute,
      deleteListRoute,
      deleteTaskRoute, // ← added here
    ]),
  ]),
  profileRoute,
]);

export const routeTree = rootRoute.addChildren([
  registerRoute,
  loginRoute,
  resetPasswordRoute,
  confirmResetPasswordRoute,
  verifyEmailRoute,
  protectedRoutes,
]);
