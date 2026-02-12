// src/hooks/useWeightForm.ts

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "../trpc";
import { useAuthStore } from "../store/authStore";
import { saveLatestWeight } from "../utils/weightCache";

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

  const queryClient = trpc.useContext();

  const weightMutation = trpc.weight.create.useMutation({
    onSuccess: async (_, variables) => {
      setMessage("Weight recorded successfully!");
      setWeight("");
      setNote("");

      // Update local cache immediately so latestWeight display refreshes
      const nowIso = new Date().toISOString();
      saveLatestWeight({
        weightKg: variables.weightKg,
        createdAt: nowIso,
      });

      // Check if this entry reached the current goal
      if (
        currentGoal &&
        variables.weightKg <= currentGoal.goalWeightKg &&
        !currentGoal.reachedAt
      ) {
        // Refetch goal to confirm it was marked as reached
        const updatedGoal = await queryClient.weight.getCurrentGoal.fetch();
        if (!updatedGoal) {
          setShowConfetti(true);
          setFadeOut(false);
          setTimeout(() => setFadeOut(true), 6000);
          setTimeout(() => setShowConfetti(false), 7000);
        }
      }

      // Invalidate queries to refresh list, current goal, and all goals
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

    weightMutation.mutate({ weightKg, note: note.trim() || undefined });
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