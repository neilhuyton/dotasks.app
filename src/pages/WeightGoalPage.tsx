// src/pages/WeightGoalPage.tsx

import { useState, useRef, useEffect } from "react";
import GoalForm from "../components/GoalForm";
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

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(
    currentGoal?.goalWeightKg.toString() ?? ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when currentGoal changes externally
  useEffect(() => {
    if (currentGoal) {
      setEditValue(currentGoal.goalWeightKg.toString());
    }
  }, [currentGoal]);

  // Focus and select input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const updateGoalMutation = trpc.weight.updateGoal.useMutation({
    onSuccess: () => {
      setIsEditing(false);
    },
    onError: () => {
      // Optionally revert editValue here if you want
      // For now we just stop editing (user can try again)
      setIsEditing(false);
    },
  });

  const handleSaveEdit = () => {
    if (!currentGoal) return;

    const newWeight = parseFloat(editValue);
    if (isNaN(newWeight) || newWeight <= 0) {
      // Invalid → cancel silently or revert
      setEditValue(currentGoal.goalWeightKg.toString());
      setIsEditing(false);
      return;
    }

    if (newWeight === currentGoal.goalWeightKg) {
      setIsEditing(false); // no change
      return;
    }

    updateGoalMutation.mutate({
      goalId: currentGoal.id, // assuming your CurrentGoalDisplay has .id from the query
      goalWeightKg: newWeight,
    });
  };

  const handleCancelEdit = () => {
    setEditValue(currentGoal?.goalWeightKg.toString() ?? "");
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

  const openGoalModal = () => {
    if (isEditing) {
      handleSaveEdit();
    }
    setGoalModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-center">
        Weight Goals
      </h1>

      {/* Clickable Current Goal Card */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openGoalModal();
          }
        }}
        aria-label="Set or update your weight goal"
        className={cn(
          "rounded-xl border bg-card/60 backdrop-blur-sm p-6",
          "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "active:scale-[0.98]",
          isEditing && "ring-2 ring-primary ring-offset-2"
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

        {currentGoal ? (
          <div className="text-center space-y-2">
            {/* Inline editable weight area */}
            <div
              className="inline-flex items-baseline justify-center gap-2"
              onClick={(e) => {
                e.stopPropagation(); // prevent opening modal when clicking to edit
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
                      updateGoalMutation.isPending && "opacity-70 animate-pulse"
                    )}
                    disabled={updateGoalMutation.isPending}
                  />
                  <span className="text-4xl font-normal text-muted-foreground">kg</span>

                  {/* Quick save/cancel buttons */}
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit();
                      }}
                      disabled={updateGoalMutation.isPending}
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
                    {currentGoal.goalWeightKg}
                  </div>
                  <span className="text-4xl font-normal text-muted-foreground">
                    kg
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Set on {formatDate(currentGoal.goalSetAt)}
              {currentGoal.reachedAt && (
                <> • Reached on {formatDate(currentGoal.reachedAt)}</>
              )}
              {isFromCache && " • cached"}
              {isServerLoaded && !isFromCache && " • synced"}
              {updateGoalMutation.isPending && " • saving..."}
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

      {/* Set/Update Goal Modal */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {currentGoal ? "Update Goal" : "Set New Goal"}
            </DialogTitle>
            <DialogDescription>Enter your target weight</DialogDescription>
          </DialogHeader>
          <div className="pt-2 pb-4">
            <GoalForm
              isInModal={true}
              onSuccessClose={() => setGoalModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal History Modal */}
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