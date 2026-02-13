// src/components/WeightForm.tsx

import { useEffect } from "react";
import { useWeightForm } from "@/hooks/useWeightForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Confetti from "react-confetti";
import { createPortal } from "react-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface WeightFormProps {
  isInModal?: boolean;
  onSuccessClose?: () => void;
}

function WeightForm({ isInModal = false, onSuccessClose }: WeightFormProps) {
  const {
    weight,
    note,
    message,
    isSubmitting,
    showConfetti,
    fadeOut,
    handleSubmit,
    handleWeightChange,
    handleNoteChange,
  } = useWeightForm();

  // Auto-close modal after success message is shown (small delay for visibility)
  useEffect(() => {
    if (
      isInModal &&
      message?.toLowerCase().includes("success") &&
      !isSubmitting
    ) {
      const timer = setTimeout(() => {
        onSuccessClose?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [message, isSubmitting, isInModal, onSuccessClose]);

  return (
    <>
      {/* Confetti explosion when goal reached */}
      {showConfetti &&
        createPortal(
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={200}
            recycle={false}
            className={cn(
              "fixed inset-0 z-[1000] pointer-events-none",
              fadeOut ? "opacity-0" : "opacity-100",
              "transition-opacity duration-1000 ease-out",
            )}
          />,
          document.body,
        )}

      <div
        className={cn(
          "mx-auto rounded-lg border border-border bg-card p-6 shadow-sm",
          isInModal && "border-none shadow-none p-0 bg-transparent",
        )}
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          data-testid="weight-form"
        >
          <div className="space-y-4">
            {/* Weight input */}
            <div className="space-y-2">
              <Label
                htmlFor="weight"
                className="text-sm font-medium text-foreground"
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
                autoFocus={isInModal} // helpful in modal
                className="h-10"
              />
            </div>

            {/* Note input – optional */}
            <div className="space-y-2">
              <Label
                htmlFor="note"
                className="text-sm font-medium text-foreground"
              >
                Note (optional)
              </Label>
              <Input
                id="note"
                type="text"
                value={note}
                onChange={handleNoteChange}
                placeholder="e.g. morning fasting, after workout, new scale..."
                disabled={isSubmitting}
                className="h-10"
              />
            </div>

            {/* Loading spinner during submission */}
            {isSubmitting && (
              <div className="flex justify-center py-2">
                <LoadingSpinner size="md" />
              </div>
            )}

            {/* Success / error message */}
            {message && (
              <p
                className={cn(
                  "text-center text-sm font-medium",
                  message.toLowerCase().includes("success")
                    ? "text-success"
                    : "text-destructive",
                )}
                role="alert"
              >
                {message}
              </p>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 font-semibold"
            >
              {isSubmitting ? "Saving..." : "Save Measurement"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

export default WeightForm;
