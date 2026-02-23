// src/components/ActionBanner.tsx

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CheckCircle2, X } from "lucide-react";

interface ActionBannerProps {
  message: string;
  variant?: "success" | "error" | "info";
  duration?: number; // ms
  onClose?: () => void;
}

export function ActionBanner({
  message,
  variant = "success",
  duration = 4000,
  onClose,
}: ActionBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!mounted || !visible) return null;

  const variantStyles = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-blue-600 text-white",
  };

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[9999] transform translate-y-0 transition-transform duration-300",
        variantStyles[variant],
        "shadow-2xl border-t border-white/10",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="rounded-full p-1 hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
