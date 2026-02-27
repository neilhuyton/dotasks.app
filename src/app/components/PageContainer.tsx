// src/app/components/PageContainer.tsx

import { cn } from "@/shared/lib/utils";
import { type ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn(className)}>{children}</div>;
}
