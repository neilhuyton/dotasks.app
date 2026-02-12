// src/components/Home.tsx

import { ScaleIcon, TargetIcon, TrendingUpIcon, ClockIcon } from "lucide-react";
import { DashboardCard } from "../components/DashboardCard";
import { useHomePage } from "../hooks/useHomePage";
import { LoadingSpinner } from "../components/LoadingSpinner";

function Home() {
  const {
    isLoading,
    hasError,
    latestWeight,
    goalWeight,
    weightChange,
    isGoalAchieved,
    recentMeasurement,
  } = useHomePage();

  return (
    <div className="w-full max-w-md lg:max-w-full mx-auto bg-background rounded-lg p-4">
      <h1
        className="text-2xl font-bold text-left mb-4"
        role="heading"
        aria-level={1}
      >
        Let's Burn!
      </h1>
      {isLoading && (
        <div className="py-4">
          <LoadingSpinner size="md" testId="home-loading" />
        </div>
      )}
      {hasError && (
        <p className="text-red-600" data-testid="error">
          Error loading data. Please try again.
        </p>
      )}
      {!isLoading && !hasError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Current Weight"
            icon={ScaleIcon}
            value={latestWeight ? `${latestWeight.toFixed(1)} kg` : null}
            description={
              latestWeight ? "Latest recorded weight" : "Record your weight"
            }
            buttonText="Record Weight"
            buttonLink="/weight"
            testId="current-weight-card"
          />
          <DashboardCard
            title="Goal Weight"
            icon={TargetIcon}
            value={goalWeight ? `${goalWeight.toFixed(1)} kg` : null}
            description={
              goalWeight
                ? isGoalAchieved
                  ? "Goal achieved!"
                  : "Your target weight"
                : "Set a weight goal"
            }
            buttonText="Set Goal"
            buttonLink="/weight-goal"
            testId="goal-weight-card"
            isGoalAchieved={isGoalAchieved}
          />
          <DashboardCard
            title="Weight Change"
            icon={TrendingUpIcon}
            value={
              weightChange !== null
                ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg`
                : null
            }
            description={
              weightChange !== null ? "Difference from goal" : "Track progress"
            }
            buttonText="View Chart"
            buttonLink="/weight-chart"
            testId="weight-change-card"
          />
          <DashboardCard
            title="Recent Measurement"
            icon={ClockIcon}
            value={recentMeasurement.value}
            description={recentMeasurement.description}
            buttonText="View All"
            buttonLink="/weights"
            testId="recent-measurement-card"
          />
        </div>
      )}
    </div>
  );
}

export default Home;
