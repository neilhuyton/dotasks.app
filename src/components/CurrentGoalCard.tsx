// src/components/CurrentGoalCard.tsx

import { useWeightGoalEditor } from "@/hooks/useWeightGoalEditor";
import EditableNumberCard from "@/components/EditableNumberCard";

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
  } = useWeightGoalEditor();

  return (
    <EditableNumberCard
      title="Current Goal"
      ariaLabel="Edit your weight goal"
      value={displayedWeight}
      unit="kg"
      statusText={statusText}
      isEditing={isEditing}
      isPending={isPending}
      editValue={editValue}
      onStartEditing={startEditing}
      onCancel={cancelEdit}
      onSave={saveEdit}
      onChange={setEditValue}
      onKeyDown={handleKeyDown}
      inputRef={inputRef}
      noValueMessage="No goal set yet"
      noValueSubMessage="Tap here to set your target weight"
      dataTestId="current-goal-weight"
    />
  );
}
