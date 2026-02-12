// src/hooks/useWeightForm.ts

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "../trpc";
import { useAuthStore } from "../store/authStore";

// Define Goal type to match weightRouter.ts and Prisma schema
type Goal = {
  id: string;
  goalWeightKg: number;
  goalSetAt: string;
  reachedAt: string | null; // Use string to match serialized Date from server
};

export function useWeightForm() {
  const { userId } = useAuthStore();
  const navigate = useNavigate();
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Fetch user's current (unreached) weight goal
  const { data: currentGoal } = trpc.weight.getCurrentGoal.useQuery(undefined, {
    enabled: !!userId,
  }) as { data: Goal | null };

  // Redirect to login if not logged in

  const queryClient = trpc.useContext();
  const weightMutation = trpc.weight.create.useMutation({
    onSuccess: async (_, variables) => {
      setMessage("Weight recorded successfully!");
      setWeight("");
      setNote("");

      // Check if the current goal exists and was just reached
      if (
        currentGoal &&
        variables.weightKg <= currentGoal.goalWeightKg &&
        !currentGoal.reachedAt
      ) {
        // Verify goal status after submission by refetching
        const updatedGoal = await queryClient.weight.getCurrentGoal.fetch();
        if (!updatedGoal) {
          // If getCurrentGoal returns null, the goal was marked as reached
          setShowConfetti(true);
          setFadeOut(false);
          // Start fade-out 1 second before the end
          setTimeout(() => setFadeOut(true), 6000);
          // Hide confetti after 7 seconds
          setTimeout(() => setShowConfetti(false), 7000);
        }
      }

      // Invalidate queries to refresh goal and weight data
      queryClient.weight.getWeights.invalidate();
      queryClient.weight.getCurrentGoal.invalidate();
      queryClient.weight.getGoals.invalidate();
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        setMessage("Please log in to record a weight.");
        navigate({ to: "/login" });
      } else {
        setMessage(`Failed to record weight: ${error.message}`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMessage("User ID not found. Please log in again.");
      navigate({ to: "/login" });
      return;
    }
    const weightKg = parseFloat(weight);
    if (isNaN(weightKg) || weightKg <= 0) {
      setMessage("Please enter a valid weight.");
      return;
    }
    weightMutation.mutate({ weightKg, note: note || undefined });
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWeight(e.target.value);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNote(e.target.value);
  };

  return {
    weight,
    note,
    message,
    isSubmitting: weightMutation.isPending,
    showConfetti,
    fadeOut,
    handleSubmit,
    handleWeightChange,
    handleNoteChange,
  };
}
