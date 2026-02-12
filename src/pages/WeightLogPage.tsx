// src/pages/WeightLogPage.tsx

import { useState } from "react";
import WeightForm from "../components/WeightForm";
import WeightList from "../components/WeightList";
import { useLatestWeight } from "../hooks/useLatestWeight";
import { formatDate } from "../utils/date";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function WeightLogPage() {
  const { latestWeight, isFromCache, isServerLoaded } = useLatestWeight();

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const openEntryModal = () => setEntryModalOpen(true);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-center">
        Weight Tracker
      </h1>

      <div
        onClick={openEntryModal}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEntryModal();
          }
        }}
        aria-label="Record or update your current weight"
        className={cn(
          "rounded-xl border bg-card/60 backdrop-blur-sm p-6",
          "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "active:scale-[0.98]"
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-muted-foreground">
            Current Weight
          </h2>

          {/* Pencil is now just visual – no interactive button */}
          <div className="text-muted-foreground/70">
            <Pencil className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        {latestWeight ? (
          <div className="text-center space-y-2">
            <div className="text-6xl font-bold tracking-tight">
              {latestWeight.weightKg}
              <span className="text-4xl font-normal text-muted-foreground ml-3">
                kg
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(latestWeight.createdAt)}
              {isFromCache && " • cached"}
              {isServerLoaded && " • synced"}
            </p>
          </div>
        ) : (
          <div className="text-center py-10 space-y-3">
            <p className="text-xl font-medium text-muted-foreground">
              No weight recorded yet
            </p>
            <p className="text-sm text-muted-foreground">
              Tap anywhere here to add your current weight
            </p>
          </div>
        )}
      </div>

      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => setHistoryModalOpen(true)}
          className="min-w-[220px]"
        >
          View History
        </Button>
      </div>

      {/* New weight entry modal */}
      <Dialog open={entryModalOpen} onOpenChange={setEntryModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {latestWeight ? "Update Weight" : "Record Weight"}
            </DialogTitle>
            <DialogDescription>
              Enter your current weight
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 pb-4">
            <WeightForm
              isInModal={true}
              onSuccessClose={() => setEntryModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* History modal remains unchanged */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Weight History</DialogTitle>
            <DialogDescription className="text-sm">
              Most recent measurements first
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <WeightList />
          </div>

          <div className="px-6 py-4 border-t flex justify-end">
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WeightLogPage;