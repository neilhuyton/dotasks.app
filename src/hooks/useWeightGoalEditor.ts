// src/hooks/useWeightGoalEditor.ts

import { trpc } from "../trpc";
import { useCurrentGoal } from "./useCurrentGoal";
import { useWeightGoalForm } from "./useWeightGoalForm";
import { useWeightGoalMutations } from "./useWeightGoalMutations";

export function useWeightGoalEditor() {
  const { currentGoal, isFromCache, isServerLoaded } = useCurrentGoal();

  const utils = trpc.useUtils();

  const form = useWeightGoalForm({ currentGoal });
  const mutations = useWeightGoalMutations({
    currentGoal,
    isFromCache,
    isServerLoaded,
  });

  const saveEdit = async () => {
    const newWeight = form.getValidatedWeight();
    if (newWeight === null) {
      form.cancelEdit();
      return;
    }

    // Exit edit mode immediately – new value is shown via optimistic update
    form.setIsEditing(false);

    let hasActiveGoal = !!currentGoal && currentGoal.reachedAt === null && !!currentGoal.id;
    let goalIdToUpdate = currentGoal?.id;

    // Optional fresh check (recommended for safety)
    try {
      const latest = await utils.weight.getCurrentGoal.fetch();
      hasActiveGoal = !!latest && latest.reachedAt === null && !!latest.id;
      goalIdToUpdate = latest?.id;
    } catch (err) {
      console.warn("[SAVE] Fresh fetch failed, using cached goal state:", err);
    }

    if (hasActiveGoal && goalIdToUpdate) {
      console.log(`[SAVE] Updating active goal: ${goalIdToUpdate} → ${newWeight} kg`);
      mutations.updateGoal.mutate({
        goalId: goalIdToUpdate,
        goalWeightKg: newWeight,
      });
    } else {
      console.log(`[SAVE] Creating new goal: ${newWeight} kg`);
      mutations.createGoal.mutate({ goalWeightKg: newWeight });
    }
  };

  return {
    isEditing: form.isEditing,
    editValue: form.editValue,
    inputRef: form.inputRef,
    setEditValue: form.setEditValue,
    startEditing: form.startEditing,
    cancelEdit: form.cancelEdit,

    isPending: mutations.isPending,
    displayedWeight: mutations.displayedWeight,
    statusText: mutations.statusText,

    saveEdit,
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit();
      } else if (e.key === "Escape") {
        form.cancelEdit();
      }
    },

    hasGoal: mutations.displayedWeight !== null,
  };
}