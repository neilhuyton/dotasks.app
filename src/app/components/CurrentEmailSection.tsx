// src/app/components/CurrentEmailSection.tsx

import { Label } from "@/app/components/ui/label";

interface Props {
  currentEmail: string;
  hasUser: boolean;
}

export default function CurrentEmailSection({ currentEmail, hasUser }: Props) {
  return (
    <section className="space-y-3">
      <Label className="text-sm font-medium block">Current Email</Label>
      {hasUser ? (
        <div
          className="p-2 bg-muted/50 rounded-lg border text-base font-medium break-all"
          data-testid="current-email"
        >
          {currentEmail}
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">
          Loading profile information...
        </div>
      )}
    </section>
  );
}