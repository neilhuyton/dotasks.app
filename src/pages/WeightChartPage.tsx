// src/components/WeightChartPage.tsx

import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { useWeightChartPage } from "../hooks/useWeightChartPage";

function WeightChartPage() {
  const {
    isLoading,
    isWeightsError,
    error,
    chartData,
    trendPeriod,
    handleTrendPeriodChange,
    goalWeight,
  } = useWeightChartPage("daily");

  // Simple trend: last vs first point
  const trend = chartData.length >= 2
    ? chartData[chartData.length - 1].weight - chartData[0].weight
    : 0;

  const trendLabel = trend > 0
    ? `Up ${Math.abs(trend).toFixed(1)} kg`
    : trend < 0
      ? `Down ${Math.abs(trend).toFixed(1)} kg`
      : "Stable";

  const TrendIcon = trend > 0 ? TrendingUp : TrendingDown;

  const chartConfig = {
    weight: {
      label: "Weight (kg)",
      color: "hsl(var(--chart-1))", // Customize via theme or use e.g. "hsl(221.2 83.2% 53.3%)"
    },
  } satisfies ChartConfig;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1
        className="text-2xl font-bold text-foreground text-center"
        role="heading"
        aria-level={1}
      >
        Your Stats
      </h1>

      {/* Latest & Goal cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {goalWeight && !isLoading && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Goal Weight</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {goalWeight}
                <span className="text-xl font-normal text-muted-foreground ml-2">
                  kg
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {/* Replace with actual goalSetAt if exposed in hook */}
                Set on 01 Oct 2023
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Chart Card */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Weight Trend</CardTitle>
            <CardDescription>
              {trendPeriod.charAt(0).toUpperCase() + trendPeriod.slice(1)} view
            </CardDescription>
          </div>

          <Select value={trendPeriod} onValueChange={handleTrendPeriodChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent className="p-0 pb-4">
          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
            </div>
          ) : isWeightsError ? (
            <div className="h-[400px] flex items-center justify-center text-destructive text-center px-6">
              {error?.message || "Failed to load weight data"}
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No weight measurements recorded yet
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <LineChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 20, right: 20, left: 12, bottom: 20 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />

                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) => {
                    if (!value) return "";
                    const d = new Date(value);
                    if (trendPeriod === "daily") return format(d, "d MMM");
                    if (trendPeriod === "weekly") return format(d, "dd MMM");
                    return format(d, "MMM yyyy");
                  }}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value} kg`}
                />

                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value: string) => format(new Date(value), "PPP")}
                      // Fixed formatter – safe conversion + type assertion
                      formatter={(value) => [
                        `${Number(value).toFixed(1)} kg`,
                        "Weight",
                      ]}
                    />
                  }
                />

                <Line
                  type="linear"
                  dataKey="weight"
                  stroke="blue"
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>

        <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
          <div className="flex gap-2 font-medium leading-none">
            {trendLabel} <TrendIcon className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            Showing weight trend over time ({trendPeriod} aggregation)
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default WeightChartPage;