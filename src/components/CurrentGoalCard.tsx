// src/components/CurrentGoalCard.tsx

import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWeightGoalEditor } from "../hooks/useWeightGoalEditor";

export default function CurrentGoalCard() {
  const {
    isEditing,
    isPending,
    displayedWeight,
    editValue,
    inputRef,
    statusText,
    startEditing,
    cancelEdit,
    saveEdit,
    setEditValue,
    handleKeyDown,
    hasGoal,
  } = useWeightGoalEditor();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !isEditing && startEditing()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!isEditing) startEditing();
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

      {hasGoal ? (
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-baseline justify-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              if (!isEditing) startEditing();
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
                  onBlur={saveEdit}
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
                      saveEdit();
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
                      cancelEdit();
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

          <p className="text-sm text-muted-foreground">{statusText}</p>
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
  );
}