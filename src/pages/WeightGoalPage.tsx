import { useState } from "react";
import CurrentGoalCard from "@/components/CurrentGoalCard";
import GoalHistoryDialog from "@/components/GoalHistoryDialog";
import { Button } from "@/components/ui/button";

export default function WeightGoalPage() {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  return (
    <div 
      className="
        min-h-[calc(100vh-3.5rem)] 
        flex flex-col 
        px-4 py-6 
        pb-24 sm:pb-28 lg:pb-32
      "
    >
      {/* Title stays at the top */}
      <h1 className="text-3xl font-bold tracking-tight text-center mb-8">
        Weight Goals
      </h1>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl space-y-10">
          <CurrentGoalCard />

          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setHistoryModalOpen(true)}
              className="min-w-[180px] border-primary text-primary hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/50"
            >
              View Goal History
            </Button>
          </div>
        </div>
      </div>

      <GoalHistoryDialog
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
      />
    </div>
  );
}