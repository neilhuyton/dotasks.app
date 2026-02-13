// src/components/EditableNumberCard.tsx

import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface EditableNumberCardProps {
  title: string;
  ariaLabel: string;
  value: number | null;
  unit: string; // e.g. "kg"
  statusText: string;
  isEditing: boolean;
  isPending: boolean;
  editValue: string;
  onStartEditing: () => void;
  onCancel: () => void;
  onSave: () => void;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;      // ← FIXED HERE
  noValueMessage: string;
  noValueSubMessage: string;
  dataTestId?: string;
  childrenWhenEditing?: ReactNode; // optional extra content when editing
}

export default function EditableNumberCard({
  title,
  ariaLabel,
  value,
  unit,
  statusText,
  isEditing,
  isPending,
  editValue,
  onStartEditing,
  onCancel,
  onSave,
  onChange,
  onKeyDown,
  inputRef,
  noValueMessage,
  noValueSubMessage,
  dataTestId = "editable-number",
  childrenWhenEditing,
}: EditableNumberCardProps) {
  const hasValue = value !== null || isEditing;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !isEditing && onStartEditing()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!isEditing) onStartEditing();
        }
      }}
      aria-label={ariaLabel}
      className={cn(
        "rounded-xl border bg-card/60 backdrop-blur-sm p-6",
        "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "active:scale-[0.98]",
        isEditing && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-muted-foreground">{title}</h2>
        <div className="text-muted-foreground/70">
          <Pencil className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      {hasValue ? (
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-baseline justify-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              if (!isEditing) onStartEditing();
            }}
          >
            {isEditing ? (
              <>
                <input
                  ref={inputRef}
                  type="number"
                  step="0.1"
                  min="0"
                  value={editValue}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={onKeyDown}
                  onBlur={onSave}
                  className={cn(
                    "w-32 text-6xl font-bold tracking-tight text-center bg-transparent border-b-2 border-primary focus:outline-none focus:border-primary/80",
                    isPending && "opacity-70 animate-pulse",
                  )}
                  disabled={isPending}
                />
                <span className="text-4xl font-normal text-muted-foreground">
                  {unit}
                </span>

                <div className="flex gap-1 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave();
                    }}
                    disabled={isPending}
                  >
                    <Check className="h-5 w-5 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel();
                    }}
                  >
                    <X className="h-5 w-5 text-red-600" />
                  </Button>
                </div>

                {childrenWhenEditing}
              </>
            ) : (
              <>
                <div
                  className="text-6xl font-bold tracking-tight cursor-text hover:text-primary transition-colors"
                  data-testid={dataTestId}
                >
                  {value}
                </div>
                <span className="text-4xl font-normal text-muted-foreground">
                  {unit}
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{statusText}</p>
        </div>
      ) : (
        <div className="text-center py-10 space-y-3">
          <p className="text-xl font-medium text-muted-foreground">
            {noValueMessage}
          </p>
          <p className="text-sm text-muted-foreground">{noValueSubMessage}</p>
        </div>
      )}
    </div>
  );
}