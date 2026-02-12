// src/hooks/useGoalForm.ts
import { useState } from "react";
import { trpc } from "../trpc";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "@tanstack/react-router";

export function useGoalForm() {
  const { userId } = useAuthStore();
  const navigate = useNavigate();
  const [goalWeight, setGoalWeight] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const setGoal = trpc.weight.setGoal.useMutation({
    onSuccess: () => {
      setMessage("Goal set successfully!");
      setGoalWeight("");
      utils.weight.getCurrentGoal.invalidate();
      utils.weight.getGoals.invalidate();
    },
    onError: (err) => {
      setMessage(err.message || "Failed to set goal");
    },
  });

  const updateGoal = trpc.weight.updateGoal.useMutation({
    onSuccess: () => {
      setMessage("Goal updated successfully!");
      setGoalWeight("");
      utils.weight.getCurrentGoal.invalidate();
      utils.weight.getGoals.invalidate();
    },
    onError: (err) => {
      setMessage(err.message || "Failed to update goal");
    },
  });

  const { data: currentGoal } = trpc.weight.getCurrentGoal.useQuery(undefined, {
    enabled: !!userId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMessage("Please log in first");
      navigate({ to: "/login" });
      return;
    }

    const value = parseFloat(goalWeight);
    if (isNaN(value) || value <= 0) {
      setMessage("Please enter a valid positive weight");
      return;
    }

    if (currentGoal) {
      updateGoal.mutate({ goalId: currentGoal.id, goalWeightKg: value });
    } else {
      setGoal.mutate({ goalWeightKg: value });
    }
  };

  return {
    goalWeight,
    message,
    isSubmitting: setGoal.isPending || updateGoal.isPending,
    handleSubmit,
    handleGoalChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setGoalWeight(e.target.value),
  };
}
