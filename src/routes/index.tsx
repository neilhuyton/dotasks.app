// src/routes/dashboard.lazy.tsx     ←  →  "/dashboard"
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  // component is optional if you use loader + pendingComponent / errorComponent
  loader: async () => {
    // fetch data...
    return { data: 'Dashboard loaded' };
  },
  component: () => <h1>Dashboard</h1>,
});