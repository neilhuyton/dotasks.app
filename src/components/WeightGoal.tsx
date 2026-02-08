// src/components/WeightGoal.tsx
import { useWeightGoal } from "../hooks/useWeightGoal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoalList from "./GoalList";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

function WeightGoal() {
  const {
    currentGoal,
    isLoading,
    error,
    goalWeight,
    message,
    isSettingGoal,
    isGoalAchieved,
    handleSubmit,
    handleGoalWeightChange,
  } = useWeightGoal();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-background min-h-[calc(100vh-3.5rem)]">
        <LoadingSpinner size="lg" testId="weight-goal-loading" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1
        className="text-2xl font-bold text-foreground text-center"
        role="heading"
        aria-level={1}
      >
        Your Goals
      </h1>
      <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-6 shadow-sm">
        {error && (
          <p
            className="text-center text-sm font-medium text-destructive mb-6"
            role="alert"
            data-testid="error-message"
          >
            Error loading goal: {error.message}
          </p>
        )}
        {currentGoal && (
          <p
            className="text-center text-sm font-medium text-foreground mb-6"
            data-testid="current-goal-display"
          >
            Current Goal: {currentGoal.goalWeightKg} kg (Set on{" "}
            {new Date(currentGoal.goalSetAt).toLocaleDateString("en-GB")})
            {isGoalAchieved && (
              <span className="text-success"> - Goal achieved!</span>
            )}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="goalWeight"
              className="text-sm font-medium text-foreground"
              data-testid="goal-weight-label"
            >
              Goal Weight (kg)
            </Label>
            <Input
              id="goalWeight"
              type="number"
              value={goalWeight}
              onChange={handleGoalWeightChange}
              placeholder="Enter your goal weight (kg)"
              required
              min="0"
              step="0.1"
              disabled={isSettingGoal}
              data-testid="goal-weight-input"
              aria-describedby="goal-weight-error"
              className="h-10 rounded-md border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button
            type="submit"
            disabled={isSettingGoal}
            className="w-full h-10 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="submit-button"
          >
            {isSettingGoal ? "Setting Goal..." : "Set Goal"}
          </Button>
        </form>
        {message && (
          <p
            className={cn(
              "text-center text-sm font-medium mt-6",
              message.toLowerCase().includes("success")
                ? "text-success"
                : "text-destructive",
            )}
            id="goal-weight-error"
            data-testid="goal-message"
            role="alert"
          >
            {message}
          </p>
        )}
      </div>
      <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-6 shadow-sm">
        <GoalList />
      </div>
    </div>
  );
}

export default WeightGoal;
