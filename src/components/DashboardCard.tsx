// src/components/DashboardCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrophyIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

type DashboardCardProps = {
  title: string;
  icon: LucideIcon;
  value: string | null;
  description: string | null;
  buttonText: string;
  buttonLink?: string;
  onButtonClick?: () => void;
  testId?: string;
  isGoalAchieved?: boolean;
  className?: string; // Added for optional custom styling
};

export function DashboardCard({
  title,
  icon: Icon,
  value,
  description,
  buttonText,
  buttonLink,
  onButtonClick,
  testId,
  isGoalAchieved = false,
  className,
}: DashboardCardProps) {
  const router = useRouter();

  return (
    <Card data-testid={testId} className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground dark:text-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-muted-foreground dark:text-muted-foreground" />
          {isGoalAchieved && (
            <TrophyIcon
              className="h-6 w-6 text-muted-foreground dark:text-muted-foreground"
              data-testid={`${testId}-trophy`}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-bold text-foreground dark:text-foreground">
              {value ?? "No data"}
            </div>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/80">
              {description ?? "No description"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
            onClick={
              onButtonClick
                ? onButtonClick
                : () => router.navigate({ to: buttonLink! })
            }
            data-testid={testId ? `${testId}-button` : undefined}
          >
            {buttonText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
