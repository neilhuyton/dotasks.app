// src/components/EditWeightModal.tsx

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { trpc } from "../trpc";
import { saveLatestWeight } from "../utils/weightCache";
import { cn } from "@/lib/utils";

interface EditWeightModalProps {
  weightId: string;
  initialWeight: number;
  // We deliberately do NOT pass initialNote anymore
}

export function EditWeightModal({
  weightId,
  initialWeight,
}: EditWeightModalProps) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState(initialWeight.toString());
  const [note, setNote] = useState(""); // ← always start empty for latest correction
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const updateMutation = trpc.weight.update.useMutation({
    onSuccess: (updated) => {
      // Update the quick-view cache
      saveLatestWeight({
        weightKg: updated.weightKg,
        createdAt: updated.createdAt,
      });

      utils.weight.getWeights.invalidate();
      utils.weight.getCurrentGoal.invalidate();

      setOpen(false);
    },
    onError: (err) => {
      setError(err.message || "Could not update weight");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const weightKg = parseFloat(weight);
    if (isNaN(weightKg) || weightKg <= 0) {
      setError("Enter a valid positive weight");
      return;
    }

    updateMutation.mutate({
      id: weightId,
      weightKg,
      note: note.trim() || undefined, // only send if user added something new
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Correct latest weight</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Correct Latest Weight</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Update the most recent measurement
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-weight">Weight (kg)</Label>
            <Input
              id="edit-weight"
              type="number"
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                setError(null);
              }}
              autoFocus
              className={cn(error && "border-destructive focus-visible:ring-destructive")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-note">Note (optional)</Label>
            <Textarea
              id="edit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. measured in morning, fasting, different scale..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Previous note is not carried over — add new context only if relevant.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <DialogFooter className="sm:justify-between gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={updateMutation.isPending || updateMutation.isError}
            >
              {updateMutation.isPending ? "Saving..." : "Update Weight"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}