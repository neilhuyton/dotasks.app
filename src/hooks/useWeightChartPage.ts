// src/hooks/useWeightChartPage.ts
import { useMemo, useState } from "react";
import { trpc } from "../trpc";
import { startOfWeek, startOfMonth, format } from "date-fns";

export const useWeightChartPage = (
  initialTrendPeriod: "daily" | "weekly" | "monthly" = "daily",
) => {
  const [trendPeriod, setTrendPeriod] = useState<
    "daily" | "weekly" | "monthly"
  >(initialTrendPeriod);
  const {
    data: weightsData,
    isLoading: weightsLoading,
    isError: weightsError,
    error: weightsErrorObj,
  } = trpc.weight.getWeights.useQuery();
  const {
    data: currentGoal,
    isLoading: goalLoading,
    isError: goalError,
    error: goalErrorObj,
  } = trpc.weight.getCurrentGoal.useQuery();

  const isLoading = weightsLoading || goalLoading;
  const error =
    weightsErrorObj || goalErrorObj || new Error("Failed to fetch data");

  const weights = useMemo(() => {
    if (!weightsData) return [];
    return weightsData.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateA.getTime() - dateB.getTime();
    });
  }, [weightsData]);

  const chartData = useMemo(() => {
    if (!weights.length) return [];
    if (trendPeriod === "daily") {
      return weights.map((weight) => ({
        date: isNaN(new Date(weight.createdAt).getTime())
          ? null
          : weight.createdAt,
        weight: weight.weightKg,
        note: weight.note,
      }));
    }

    const groupedData = weights.reduce(
      (acc, weight) => {
        const date = new Date(weight.createdAt);
        if (isNaN(date.getTime())) return acc;
        let key: string;
        if (trendPeriod === "weekly") {
          key = format(startOfWeek(date, { weekStartsOn: 0 }), "yyyy-MM-dd");
        } else {
          key = format(startOfMonth(date), "yyyy-MM");
        }
        if (!acc[key]) acc[key] = { weights: [], note: weight.note };
        acc[key].weights.push(weight.weightKg);
        return acc;
      },
      {} as Record<string, { weights: number[]; note: string | null }>,
    );

    return Object.entries(groupedData).map(([date, { weights, note }]) => ({
      date,
      weight: weights.reduce((sum, w) => sum + w, 0) / weights.length,
      note,
    }));
  }, [weights, trendPeriod]);

  const chartConfig = useMemo(
    () => ({
      weight: {
        label: "Weight (kg)",
        color: "oklch(0.6 0.15 190)", // Hardcoded teal
      },
    }),
    [],
  );

  const barColor = chartConfig.weight.color;

  const handleTrendPeriodChange = (value: string) => {
    if (value === "daily" || value === "weekly" || value === "monthly") {
      setTrendPeriod(value);
    }
  };

  const goalWeight = useMemo(() => {
    return currentGoal?.goalWeightKg ?? null;
  }, [currentGoal]);

  return {
    weights,
    isLoading,
    isWeightsError: weightsError, // Separate error for weights
    isGoalError: goalError, // Separate error for goals
    error,
    chartData,
    chartConfig,
    barColor,
    trendPeriod,
    handleTrendPeriodChange,
    goalWeight,
  };
};
