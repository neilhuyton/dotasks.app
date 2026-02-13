// src/components/CurrentWeightCard.tsx

import { useLatestWeightEditor } from "../hooks/useLatestWeightEditor";
import EditableNumberCard from "./EditableNumberCard";

export default function CurrentWeightCard() {
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
    // hasWeight,  ← removed (unused)
  } = useLatestWeightEditor();

  return (
    <EditableNumberCard
      title="Current Weight"
      ariaLabel="Record or update your current weight"
      value={displayedWeight ?? null}           // safe fallback to null
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
      noValueMessage="No weight recorded yet"
      noValueSubMessage="Tap here to add your current weight"
      dataTestId="current-weight-display"
    />
  );
}