// src/pages/WeightGoalPage.tsx

import { useState, useRef, useEffect } from "react";
import GoalList from "../components/GoalList";
import { useCurrentGoal } from "../hooks/useCurrentGoal";
import { formatDate } from "../utils/date";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trpc } from "../trpc";

export default function WeightGoalPage() {
  const { currentGoal, isFromCache, isServerLoaded } = useCurrentGoal();

  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(
    currentGoal?.goalWeightKg?.toString() ?? "",
  );

  // Optimistic value for current goal display
  const [optimisticWeight, setOptimisticWeight] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentGoal) {
      setEditValue(currentGoal.goalWeightKg.toString());
      if (optimisticWeight === currentGoal.goalWeightKg) {
        setOptimisticWeight(null);
      }
    } else {
      setEditValue("");
      // Do NOT clear optimisticWeight here – needed for new goal creation
    }
  }, [currentGoal]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const utils = trpc.useUtils();

  const updateGoalMutation = trpc.weight.updateGoal.useMutation({
    onMutate: async (variables) => {
      const previousCurrent = currentGoal?.goalWeightKg;
      setOptimisticWeight(variables.goalWeightKg);

      const previousGoals = utils.weight.getGoals.getData();
      if (previousGoals && currentGoal) {
        const updated = previousGoals.map((g) =>
          g.id === currentGoal.id
            ? { ...g, goalWeightKg: variables.goalWeightKg }
            : g,
        );
        utils.weight.getGoals.setData(undefined, updated);
      }

      return { previousCurrent, previousGoals };
    },
    onSuccess: () => {
      utils.weight.getCurrentGoal.invalidate();
      utils.weight.getGoals.invalidate();
      setIsEditing(false);
    },
    onError: (_, __, context) => {
      setOptimisticWeight(null);
      if (context?.previousCurrent !== undefined) {
        setEditValue(context.previousCurrent.toString());
      }
      if (context?.previousGoals) {
        utils.weight.getGoals.setData(undefined, context.previousGoals);
      }
      setIsEditing(false);
    },
  });

  const setGoalMutation = trpc.weight.setGoal.useMutation({
    onMutate: async (variables) => {
      setOptimisticWeight(variables.goalWeightKg);

      const previousGoals = utils.weight.getGoals.getData() ?? [];
      const tempGoal = {
        id: `temp-${Date.now()}`,
        goalWeightKg: variables.goalWeightKg,
        goalSetAt: new Date().toISOString(),
        reachedAt: null,
      };
      utils.weight.getGoals.setData(undefined, [tempGoal, ...previousGoals]);

      return { previousGoals };
    },
    onSuccess: () => {
      utils.weight.getCurrentGoal.invalidate();
      utils.weight.getGoals.invalidate();
      setIsEditing(false);
    },
    onError: (_, __, context) => {
      setOptimisticWeight(null);
      if (context?.previousGoals) {
        utils.weight.getGoals.setData(undefined, context.previousGoals);
      }
      setIsEditing(false);
    },
  });

  const handleSaveEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      handleCancelEdit();
      return;
    }

    const newWeight = parseFloat(trimmed);
    if (isNaN(newWeight) || newWeight <= 0) {
      setEditValue(currentGoal?.goalWeightKg?.toString() ?? "");
      setIsEditing(false);
      return;
    }

    if (currentGoal && newWeight === currentGoal.goalWeightKg) {
      setIsEditing(false);
      return;
    }

    // Optimistic UI update – immediate, no flash
    setOptimisticWeight(newWeight);

    let hasActiveGoal = false;
    let goalIdToUpdate: string | undefined;

    try {
      // Try to get fresh state (safe fallback if fails)
      const latestGoal = await utils.weight.getCurrentGoal.fetch();
      hasActiveGoal =
        !!latestGoal && latestGoal.reachedAt === null && !!latestGoal.id;
      goalIdToUpdate = latestGoal?.id;
    } catch (err) {
      console.warn(
        "[SAVE] Failed to fetch fresh goal – using current state:",
        err,
      );
      // Fallback to current (possibly stale) state
      hasActiveGoal =
        !!currentGoal && currentGoal.reachedAt === null && !!currentGoal.id;
      goalIdToUpdate = currentGoal?.id;
    }

    if (hasActiveGoal && goalIdToUpdate) {
      console.log(
        "[SAVE] Updating active goal:",
        goalIdToUpdate,
        "→",
        newWeight,
      );
      updateGoalMutation.mutate({
        goalId: goalIdToUpdate,
        goalWeightKg: newWeight,
      });
    } else {
      console.log("[SAVE] Creating new goal:", newWeight);
      setGoalMutation.mutate({
        goalWeightKg: newWeight,
      });
    }

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(currentGoal?.goalWeightKg?.toString() ?? "");
    setOptimisticWeight(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const isPending = updateGoalMutation.isPending || setGoalMutation.isPending;

  const displayedWeight =
    optimisticWeight !== null
      ? optimisticWeight
      : (currentGoal?.goalWeightKg ?? null);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-center">
        Weight Goals
      </h1>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !isEditing && setIsEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!isEditing) setIsEditing(true);
          }
        }}
        aria-label="Edit your weight goal"
        className={cn(
          "rounded-xl border bg-card/60 backdrop-blur-sm p-6",
          "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "active:scale-[0.98]",
          isEditing && "ring-2 ring-primary ring-offset-2",
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-muted-foreground">
            Current Goal
          </h2>
          <div className="text-muted-foreground/70">
            <Pencil className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        {displayedWeight !== null ? (
          <div className="text-center space-y-2">
            <div
              className="inline-flex items-baseline justify-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                if (!isEditing) setIsEditing(true);
              }}
            >
              {isEditing ? (
                <>
                  <input
                    ref={inputRef}
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSaveEdit}
                    className={cn(
                      "w-32 text-6xl font-bold tracking-tight text-center bg-transparent border-b-2 border-primary focus:outline-none focus:border-primary/80",
                      isPending && "opacity-70 animate-pulse",
                    )}
                    disabled={isPending}
                  />
                  <span className="text-4xl font-normal text-muted-foreground">
                    kg
                  </span>

                  <div className="flex gap-1 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit();
                      }}
                      disabled={isPending}
                    >
                      <Check className="h-5 w-5 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                    >
                      <X className="h-5 w-5 text-red-600" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="text-6xl font-bold tracking-tight cursor-text hover:text-primary transition-colors"
                    data-testid="current-goal-weight"
                  >
                    {displayedWeight}
                  </div>
                  <span className="text-4xl font-normal text-muted-foreground">
                    kg
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {optimisticWeight !== null
                ? "Saving new goal..."
                : currentGoal
                  ? `Set on ${formatDate(currentGoal.goalSetAt)}${
                      currentGoal.reachedAt
                        ? ` • Reached on ${formatDate(currentGoal.reachedAt)}`
                        : ""
                    }${isFromCache ? " • cached" : ""}${
                      isServerLoaded && !isFromCache ? " • synced" : ""
                    }`
                  : ""}
              {isPending && optimisticWeight === null && " • saving..."}
            </p>
          </div>
        ) : (
          <div className="text-center py-10 space-y-3">
            <p className="text-xl font-medium text-muted-foreground">
              No goal set yet
            </p>
            <p className="text-sm text-muted-foreground">
              Tap here to set your target weight
            </p>
          </div>
        )}
      </div>

      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => setHistoryModalOpen(true)}
          className="min-w-[220px]"
        >
          View Goal History
        </Button>
      </div>

      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Goal History</DialogTitle>
            <DialogDescription className="text-sm">
              Most recent goals first
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <GoalList />
          </div>

          <div className="px-6 py-4 border-t flex justify-end">
            <Button
              variant="outline"
              onClick={() => setHistoryModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
