import { formatDate } from "@/utils/date";
import { trpc } from "../trpc";
import { useLatestWeight } from "./useLatestWeight";
import { useState, useRef, useEffect } from "react";
import { saveLatestWeight } from "../utils/weightCache";

export function useLatestWeightEditor() {
  const { latestWeight, isFromCache, isServerLoaded } = useLatestWeight();

  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(
    latestWeight?.weightKg?.toString() ?? "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (latestWeight) {
      setEditValue(latestWeight.weightKg.toString());
    } else {
      setEditValue("");
    }
  }, [latestWeight]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = () => setIsEditing(true);
  const cancelEdit = () => {
    setEditValue(latestWeight?.weightKg?.toString() ?? "");
    setIsEditing(false);
  };

  const getValidatedWeight = (): number | null => {
    const trimmed = editValue.trim();
    if (!trimmed) return null;
    const val = parseFloat(trimmed);
    if (isNaN(val) || val <= 0) return null;
    if (latestWeight && val === latestWeight.weightKg) return null;
    return val;
  };

  const mutation = trpc.weight.create.useMutation({
    onMutate: async ({ weightKg, note }) => {
      // Optimistic: show new value immediately
      // You can also update getWeights list optimistically if you want
      const previousWeights = utils.weight.getWeights.getData() ?? [];

      const tempEntry = {
        id: `temp-${Date.now()}`,
        weightKg,
        createdAt: new Date().toISOString(),
        note: note || null,
      };

      utils.weight.getWeights.setData(undefined, [
        tempEntry,
        ...previousWeights,
      ]);

      return { previousWeights };
    },
    onSuccess: (_, { weightKg }) => {
      // Update local cache
      saveLatestWeight({
        weightKg,
        createdAt: new Date().toISOString(),
      });

      utils.weight.getWeights.invalidate();
      utils.weight.getCurrentGoal.invalidate(); // in case goal reached
    },
    onError: (_, __, context) => {
      if (context?.previousWeights) {
        utils.weight.getWeights.setData(undefined, context.previousWeights);
      }
    },
  });

  const isPending = mutation.isPending;

  const displayedWeight = isPending
    ? parseFloat(editValue) || latestWeight?.weightKg
    : (latestWeight?.weightKg ?? null);

  const statusText = (() => {
    if (isPending) return "Saving new weight...";

    if (!latestWeight) return "";

    const parts = [formatDate(latestWeight.createdAt)];
    if (isFromCache) parts.push(" • cached");
    if (isServerLoaded) parts.push(" • synced");
    return parts.join("");
  })();

  const saveEdit = async () => {
    const newWeight = getValidatedWeight();
    if (newWeight === null) {
      cancelEdit();
      return;
    }

    setIsEditing(false);

    mutation.mutate({
      weightKg: newWeight,
      note: "", // you can add note input later if desired
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  return {
    isEditing,
    isPending,
    displayedWeight,
    editValue,
    inputRef,
    setEditValue,
    startEditing,
    cancelEdit,
    saveEdit,
    handleKeyDown,
    hasWeight: displayedWeight !== null,
    statusText,
  };
}
