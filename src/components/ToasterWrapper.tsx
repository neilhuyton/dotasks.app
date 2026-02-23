// src/components/ToasterWrapper.tsx
import { Toaster } from "@/components/ui/sonner";

export function ToasterWrapper() {
  return (
    <Toaster
      position="bottom-center"
      richColors
      duration={5500}
      closeButton={false}
      visibleToasts={3}
      offset={0}
      toastOptions={{
        // ────────────────────────────────────────────────
        // Force banner behavior
        // ────────────────────────────────────────────────
        className:
          "w-[100vw] max-w-[100vw] min-w-[100vw] rounded-none pointer-events-auto",

        classNames: {
          toast:
            "w-[100vw] max-w-[100vw] min-w-[100vw] rounded-none " +
            "border-x-0 border-t-0 border-b border-border/30 " +
            "m-0 p-0 " +
            "min-h-[52px] items-center justify-center " +
            "px-5 xs:px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16 2xl:px-20",

          title: "text-base font-semibold tracking-tight",
          description: "text-sm opacity-90 mt-0.5 leading-snug",

          success:
            "bg-gradient-to-r from-green-50/90 to-green-50/70 text-green-950 " +
            "[&_.sonner-title]:text-green-900 [&_.sonner-description]:text-green-800",
          error: "bg-gradient-to-r from-red-50/90 to-red-50/70 text-red-950",
          warning:
            "bg-gradient-to-r from-yellow-50/90 to-yellow-50/70 text-yellow-950",
          info: "bg-gradient-to-r from-blue-50/90 to-blue-50/70 text-blue-950",
        },

        style: {
          // Override Sonner's centering completely
          width: "100vw",
          maxWidth: "100vw",
          minWidth: "100vw",
          left: "0 !important",
          right: "0 !important",
          transform: "none !important",
          borderRadius: "0",
          boxShadow: "0 -8px 24px -10px rgba(0,0,0,0.20)",
        },
      }}
    />
  );
}
