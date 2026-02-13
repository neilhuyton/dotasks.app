// src/hooks/useWeightGoalForm.ts

import { useState, useRef, useEffect } from "react";

export type WeightGoal = {
  id: string;
  goalWeightKg: number;
  goalSetAt: string;
  reachedAt: string | null;
};

interface UseWeightGoalFormProps {
  currentGoal: WeightGoal | null;
}

export function useWeightGoalForm({ currentGoal }: UseWeightGoalFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(
    currentGoal?.goalWeightKg?.toString() ?? ""
  );

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentGoal) {
      setEditValue(currentGoal.goalWeightKg.toString());
    } else {
      setEditValue("");
    }
  }, [currentGoal]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = () => setIsEditing(true);

  const cancelEdit = () => {
    setEditValue(currentGoal?.goalWeightKg?.toString() ?? "");
    setIsEditing(false);
  };

  const getValidatedWeight = (): number | null => {
    const trimmed = editValue.trim();
    if (!trimmed) return null;

    const weight = parseFloat(trimmed);
    if (isNaN(weight) || weight <= 0) return null;

    if (currentGoal && weight === currentGoal.goalWeightKg) return null;

    return weight;
  };

  return {
    isEditing,
    editValue,
    inputRef,
    setEditValue,
    startEditing,
    cancelEdit,
    getValidatedWeight,
    setIsEditing,
  };
}