// src/components/WeightForm.tsx

import { useWeightForm } from "../hooks/useWeightForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Confetti from "react-confetti";
import { createPortal } from "react-dom";
import { LoadingSpinner } from "./LoadingSpinner";

function WeightForm() {
  const {
    weight,
    // note,
    message,
    isSubmitting,
    showConfetti,
    fadeOut,
    handleSubmit,
    handleWeightChange,
    // handleNoteChange,
  } = useWeightForm();

  return (
    <>
      {showConfetti &&
        createPortal(
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={200}
            recycle={false}
            data-testid="confetti"
            className={cn(
              "fixed inset-0 z-[1000]",
              fadeOut ? "opacity-0" : "opacity-100",
              "transition-opacity duration-1000 ease-out"
            )}
          />,
          document.body
        )}
      <div className="mx-auto max-w-4xl lg:max-w-4xl rounded-lg border border-border bg-card p-6 shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          data-testid="weight-form"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="weight"
                className="text-sm font-medium text-foreground"
                data-testid="weight-label"
              >
                Weight (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={handleWeightChange}
                placeholder="Enter your weight (kg)"
                required
                min="0"
                step="0.1"
                disabled={isSubmitting}
                data-testid="weight-input"
                aria-describedby="weight-error"
                className="h-10 rounded-md border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {/* <div className="space-y-2">
              <Label
                htmlFor="note"
                className="text-sm font-medium text-foreground"
                data-testid="note-label"
              >
                Optional Note
              </Label>
              <Input
                id="note"
                type="text"
                value={note}
                onChange={handleNoteChange}
                placeholder="Optional note"
                disabled={isSubmitting}
                data-testid="note-input"
                className="h-10 rounded-md border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div> */}
            {isSubmitting && (
              <div className="flex justify-center">
                <LoadingSpinner size="md" testId="weight-form-submitting" />
              </div>
            )}
            {message && (
              <p
                className={cn(
                  "text-center text-sm font-medium",
                  message.toLowerCase().includes("success")
                    ? "text-success"
                    : "text-destructive"
                )}
                id="weight-error"
                data-testid="weight-message"
                role="alert"
              >
                {message}
              </p>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="submit-button"
            >
              {isSubmitting ? "Submitting..." : "Submit Weight"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

export default WeightForm;
