// src/components/WeightChartPage.tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useWeightChartPage } from "../hooks/useWeightChartPage";

function WeightChartPage() {
  const {
    weights,
    isLoading,
    isWeightsError,
    isGoalError,
    error,
    chartData,
    chartConfig,
    barColor,
    trendPeriod,
    handleTrendPeriodChange,
    goalWeight,
  } = useWeightChartPage("daily");

  const latestWeight = weights?.length
    ? weights.reduce((latest, weight) =>
        new Date(weight.createdAt) > new Date(latest.createdAt)
          ? weight
          : latest,
      )
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1
        className="text-2xl font-bold text-foreground text-center"
        role="heading"
        aria-level={1}
        data-slot="card-title"
      >
        Your Stats
      </h1>
      {latestWeight && !isWeightsError && !isLoading && (
        <div
          className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-6 shadow-sm"
          data-testid="latest-weight-card"
        >
          <h2 className="text-lg font-semibold text-foreground">
            Latest Weight
          </h2>
          <p className="text-2xl font-bold text-foreground">
            {latestWeight.weightKg} kg
          </p>
          <p className="text-sm text-muted-foreground">
            Recorded on{" "}
            {new Date(latestWeight.createdAt).toLocaleDateString("en-GB")}
          </p>
        </div>
      )}
      {goalWeight && !isGoalError && !isLoading && (
        <div
          className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-6 shadow-sm"
          data-testid="goal-weight-card"
        >
          <h2 className="text-lg font-semibold text-foreground">Goal Weight</h2>
          <p className="text-2xl font-bold text-foreground">{goalWeight} kg</p>
          <p className="text-sm text-muted-foreground">
            Set on{" "}
            {new Date("2023-10-01T00:00:00Z").toLocaleDateString("en-GB")}
          </p>
        </div>
      )}
      <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <Select onValueChange={handleTrendPeriodChange} value={trendPeriod}>
            <SelectTrigger
              data-testid="unit-select"
              aria-label="Select trend period"
              className="w-[120px] h-9 text-sm border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SelectValue>
                {trendPeriod.charAt(0).toUpperCase() + trendPeriod.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent data-testid="select-content">
              <SelectItem data-testid="select-option-daily" value="daily">
                Daily
              </SelectItem>
              <SelectItem data-testid="select-option-weekly" value="weekly">
                Weekly
              </SelectItem>
              <SelectItem data-testid="select-option-monthly" value="monthly">
                Monthly
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          </div>
        ) : isWeightsError ? (
          <p
            data-testid="error"
            className="text-center text-sm font-medium text-destructive"
            role="alert"
          >
            Error: {error?.message || "Failed to fetch weights"}
          </p>
        ) : !weights?.length ? (
          <p
            data-testid="no-data"
            className="text-center text-sm font-medium text-muted-foreground"
            role="alert"
          >
            No weight measurements found
          </p>
        ) : (
          <div className="h-[400px] w-full">
            <ChartContainer
              config={chartConfig}
              id="weight-chart"
              className="h-full w-full"
              data-testid="chart-mock"
            >
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value
                      ? new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: trendPeriod === "daily" ? "numeric" : undefined,
                          year:
                            trendPeriod === "monthly" ? "numeric" : undefined,
                        })
                      : ""
                  }
                  stroke="hsl(var(--foreground))"
                />
                <YAxis
                  dataKey="weight"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => `${value} kg`}
                  stroke="hsl(var(--foreground))"
                />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value, name, props) => [
                        `${value} kg${
                          props.payload.note ? ` (${props.payload.note})` : ""
                        }`,
                        "Weight",
                      ]}
                    />
                  }
                />
                <Bar
                  dataKey="weight"
                  fill={barColor}
                  fillOpacity={0.8}
                  radius={4}
                  data-testid="bar-mock"
                />
              </BarChart>
            </ChartContainer>
            <ul style={{ display: "none" }}>
              {weights.map((weight) => (
                <li key={weight.id} data-testid="weight-data-point">
                  {weight.weightKg} kg -{" "}
                  {new Date(weight.createdAt).toLocaleDateString("en-GB")}{" "}
                  {weight.note && `(${weight.note})`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeightChartPage;
