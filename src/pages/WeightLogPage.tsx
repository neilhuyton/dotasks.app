// src/pages/WeightLogPage.tsx

import { useState } from "react";
import CurrentWeightCard from "../components/CurrentWeightCard";
import WeightHistoryDialog from "../components/WeightHistoryDialog";
import { Button } from "@/components/ui/button";

export default function WeightLogPage() {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-center">
        Weight Tracker
      </h1>

      <CurrentWeightCard />

      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => setHistoryOpen(true)}
          className="min-w-55"
        >
          View History
        </Button>
      </div>

      <WeightHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}