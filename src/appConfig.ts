
export const APP_CONFIG = {
  appName: import.meta.env.VITE_APP_NAME,
  defaultAuthenticatedPath: "/home" as const,
  navItems: []
} as const;
