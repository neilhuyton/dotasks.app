// src/components/ActionBanner.tsx
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, X } from 'lucide-react';
import { useBannerStore } from '@/store/bannerStore';

export function ActionBanner() {
  const { banner, hide } = useBannerStore();

  useEffect(() => {
    if (!banner || banner.duration === 0) return;
    const timer = setTimeout(hide, banner.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [banner, hide]);

  if (!banner) return null;

  const variantStyles = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
  };

  return createPortal(
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-[9999]',
        variantStyles[banner.variant ?? 'success'],
        'shadow-2xl border-t border-white/20',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{banner.message}</p>
        </div>
        <button
          onClick={hide}
          className="rounded-full p-1.5 hover:bg-white/20 transition-colors"
          aria-label="Close banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body
  );
}