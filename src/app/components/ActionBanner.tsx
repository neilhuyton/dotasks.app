// src/app/components/ActionBanner.tsx

import { createPortal } from "react-dom";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useBannerStore } from "@/shared/store/bannerStore";

export function ActionBanner() {
  const { banner, hide } = useBannerStore();

  useEffect(() => {
    if (!banner || banner.duration === 0) return;
    const timer = setTimeout(hide, banner.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [banner, hide]);

  if (!banner) return null;

  const variantConfig = {
    success: {
      bg: "bg-[color-mix(in_oklab,var(--primary)_80%,white_20%)]",
      text: "text-[oklch(0.98_0_0)]",
      icon: "text-[color-mix(in_oklab,var(--primary)_90%,white_10%)]",
      closeHover: "hover:bg-[color-mix(in_oklab,var(--primary)_30%,black_70%)]",
    },
    error: {
      bg: "bg-[color-mix(in_oklab,var(--primary)_75%,oklch(0.55_0.25_30)_25%)]",
      text: "text-white",
      icon: "text-[color-mix(in_oklab,oklch(0.9_0.2_30),var(--primary)_40%)]",
      closeHover: "hover:bg-black/30",
    },
    info: {
      bg: "bg-[color-mix(in_oklab,var(--primary)_85%,white_15%)]",
      text: "text-[oklch(0.98_0_0)]",
      icon: "text-[color-mix(in_oklab,var(--primary)_95%,white_5%)]",
      closeHover: "hover:bg-[color-mix(in_oklab,var(--primary)_20%,black_80%)]",
    },
  };

  const variant = banner.variant ?? "success";
  const styles = variantConfig[variant];

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[9999] shadow-2xl border-t border-white/10 backdrop-blur-md",
        styles.bg,
        "transition-all duration-300 ease-in-out",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-3.5 flex items-center justify-center sm:px-6 lg:px-8 relative">
        {/* Message - centered */}
        <div className="flex items-center justify-center flex-1">
          <p
            className={cn(
              "text-sm font-medium leading-tight text-center",
              styles.text,
            )}
            data-testid="banner-message"
          >
            {banner.message}
          </p>
        </div>

        {/* Close button - positioned on the right */}
        <button
          onClick={hide}
          className={cn(
            "rounded-full p-1.5 transition-colors duration-200 absolute right-4 sm:right-6 lg:right-8",
            styles.closeHover,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          )}
          aria-label="Close banner"
        >
          <X className={cn("h-5 w-5", styles.text)} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
