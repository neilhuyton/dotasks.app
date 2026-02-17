// src/routes/__root.tsx
// This is the GLOBAL ROOT route – required by TanStack Router's Vite plugin
// It wraps EVERYTHING (public + authenticated routes + layouts + outlets)

import { createRootRoute, Outlet } from '@tanstack/react-router'
// Optional: add meta, head, scripts, providers, etc. here later

export const Route = createRootRoute({
  // You can add global beforeLoad / context / errorComponent here if needed
  // beforeLoad: ... 
  // component: () => <div>Global wrapper</div>

  // For now, the minimal version is just passing <Outlet /> down
  component: () => <Outlet />,
})