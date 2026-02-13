// src/components/GoalForm.tsx
import { useEffect } from "react";
import { useGoalForm } from "@/hooks/useGoalForm"; // ← you'll create this
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface GoalFormProps {
  isInModal?: boolean;
  onSuccessClose?: () => void;
}

export default function GoalForm({
  isInModal = false,
  onSuccessClose,
}: GoalFormProps) {
  const { goalWeight, message, isSubmitting, handleSubmit, handleGoalChange } =
    useGoalForm();

  useEffect(() => {
    if (
      isInModal &&
      message?.toLowerCase().includes("success") &&
      !isSubmitting
    ) {
      const timer = setTimeout(() => onSuccessClose?.(), 1000);
      return () => clearTimeout(timer);
    }
  }, [message, isSubmitting, isInModal, onSuccessClose]);

  return (
    <div
      className={cn(
        "space-y-6",
        isInModal && "p-0 bg-transparent border-none shadow-none",
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="goalWeight">Goal Weight (kg)</Label>
          <Input
            id="goalWeight"
            type="number"
            step="0.1"
            min="0"
            value={goalWeight}
            onChange={handleGoalChange}
            placeholder="e.g. 68.5"
            disabled={isSubmitting}
            autoFocus={isInModal}
            required
          />
        </div>

        {isSubmitting && (
          <div className="flex justify-center py-2">
            <LoadingSpinner size="md" />
          </div>
        )}

        {message && (
          <p
            data-testid="form-message"
            className={cn(
              "text-center text-sm font-medium",
              message.toLowerCase().includes("success")
                ? "text-green-600"
                : "text-destructive",
            )}
          >
            {message}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Saving..." : "Save Goal"}
        </Button>
      </form>
    </div>
  );
}
