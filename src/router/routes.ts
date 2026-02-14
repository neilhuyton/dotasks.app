// src/router/routes.ts
import { createRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

// Pages
import RegisterPage from '@/pages/RegisterPage';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import ConfirmResetPasswordPage from '@/pages/ConfirmResetPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import ProfilePage from '@/pages/ProfilePage';
import ListsPage from '@/pages/ListsPage';
import ListDetailPage from '@/pages/ListDetailPage';

// Schemas for search params (modals)
const modalSearchSchema = z.object({
  modal: z.enum(['new-list', 'new-task', 'edit-list', 'edit-task']).optional(),
  taskId: z.string().uuid().optional(), // only for edit-task
});

// Layout & root
import { rootRoute } from './rootRoute';
import { authenticatedRoute } from './_authenticated';

// ─── PUBLIC ROUTES ─────────────────────────────────────────────────

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
});

export const confirmResetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirm-reset-password',
  component: ConfirmResetPasswordPage,
});

export const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  component: VerifyEmailPage,
});

// ─── PROTECTED ROUTES ──────────────────────────────────────────────

export const homeRedirectRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  loader: () => {
    throw redirect({ to: '/lists' as const, replace: true });
  },
});

export const listsIndexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'lists',
  validateSearch: modalSearchSchema,
  component: ListsPage,
});

export const listDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$listId',
  parseParams: (params) => ({ listId: params.listId }),
  stringifyParams: ({ listId }) => ({ listId }),
  validateSearch: modalSearchSchema,
  component: ListDetailPage,
});

export const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'profile',
  component: ProfilePage,
});