// src/pages/WeightGoalPage.tsx

import { useState } from "react";
import CurrentGoalCard from "@/components/CurrentGoalCard";
import GoalHistoryDialog from "@/components/GoalHistoryDialog";
import { Button } from "@/components/ui/button";

export default function WeightGoalPage() {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-center">
        Weight Goals
      </h1>

      <CurrentGoalCard />

      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => setHistoryModalOpen(true)}
          className="min-w-55"
        >
          View Goal History
        </Button>
      </div>

      <GoalHistoryDialog
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
      />
    </div>
  );
}
