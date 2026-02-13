// src/components/InstallPrompt.tsx

import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallPrompt({
  isLoggedIn,
  isPublicRoute,
}: {
  isLoggedIn: boolean;
  isPublicRoute: boolean;
}) {
  const { installPrompt, isIOS, handleInstallClick } = useInstallPrompt();

  if (!(installPrompt || isIOS) || !isLoggedIn || isPublicRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-26 left-4 right-4 bg-primary text-foreground dark:bg-primary dark:text-foreground p-4 rounded-md shadow-lg z-50">
      <p className="text-center text-foreground dark:text-foreground">
        {isIOS
          ? "Tap the Share icon and select 'Add to Home Screen' to install My Weigh"
          : "Install My Weigh for quick access!"}
      </p>
      <button
        className="mt-2 w-full bg-background dark:bg-background text-primary dark:text-primary py-2 rounded hover:bg-accent dark:hover:bg-accent hover:text-accent-foreground dark:hover:text-accent-foreground"
        onClick={handleInstallClick}
        disabled={isIOS}
      >
        {isIOS ? "Install via Safari" : "Install App"}
      </button>
    </div>
  );
}
