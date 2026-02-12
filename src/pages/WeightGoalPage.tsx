// src/pages/WeightGoalPage.tsx

import { useState } from "react";
import GoalForm from "../components/GoalForm"; // ← new component
import GoalList from "../components/GoalList";
import { useCurrentGoal } from "../hooks/useCurrentGoal"; // ← new/reusable hook
import { formatDate } from "../utils/date";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function WeightGoalPage() {
  const { currentGoal, isLoading, isFromCache, isServerLoaded } =
    useCurrentGoal();

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const openGoalModal = () => setGoalModalOpen(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-center">
        Weight Goals
      </h1>

      {/* ========================================= */}
      {/* Clickable Current Goal Card */}
      {/* ========================================= */}
      <div
        onClick={openGoalModal}
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
            <div
              className="text-6xl font-bold tracking-tight"
              data-testid="current-goal-weight" // ← add this
            >
              {currentGoal.goalWeightKg}
              <span className="text-4xl font-normal text-muted-foreground ml-3">
                kg
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Set on {formatDate(currentGoal.goalSetAt)}
              {currentGoal.reachedAt && (
                <> • Reached on {formatDate(currentGoal.reachedAt)}</>
              )}
              {isFromCache && " • cached"}
              {isServerLoaded && !isFromCache && " • synced"}
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

      {/* ========================================= */}
      {/* Set/Update Goal Modal */}
      {/* ========================================= */}
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

      {/* ========================================= */}
      {/* Goal History Modal */}
      {/* ========================================= */}
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
