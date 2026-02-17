// src/routes/_authenticated/route.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/authStore'  // adjust import path to match your setup

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const { isLoggedIn } = useAuthStore.getState()

    if (!isLoggedIn) {
      throw redirect({
        to: '/login',
        // search: (prev) => ({ ...prev, redirect: location.href }),  // preserve original URL
        replace: true,
      })
    }
  },
  component: () => <Outlet />,  // ← add shared protected layout (navbar, etc.) here later
})