// src/components/WeightList.tsx

import { useWeightList } from "@/hooks/useWeightList";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";

function WeightList() {
  const {
    weights,
    isLoading,
    isError,
    error,
    formatDate,
    handleDelete,
    isDeleting,
  } = useWeightList();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!weights || weights.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground italic">
        No measurements recorded yet
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-b hover:bg-transparent">
            <TableHead className="pl-0 font-medium w-1/4">
              Weight (kg)
            </TableHead>
            <TableHead className="font-medium">Date</TableHead>
            <TableHead className="text-right font-medium pr-0 w-16">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weights.map((weight) => (
            <TableRow
              key={weight.id}
              className="border-b last:border-b-0 hover:bg-muted/60 transition-colors"
            >
              <TableCell className="pl-0 font-medium">
                {weight.weightKg}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(weight.createdAt)}
              </TableCell>
              <TableCell className="text-right pr-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(weight.id)}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                  aria-label={`Delete entry from ${formatDate(weight.createdAt)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {isError && (
        <p className="mt-6 text-center text-sm text-destructive">
          {error?.message || "Failed to load weight history"}
        </p>
      )}
    </>
  );
}

export default WeightList;
