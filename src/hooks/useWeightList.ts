// src/hooks/useWeightList.ts
import { trpc } from "../trpc";
import { formatDate } from "../utils/date";

export function useWeightList() {
  const {
    data: weightsRaw,
    isLoading,
    isError,
    error,
  } = trpc.weight.getWeights.useQuery(undefined, {});

  const weights = weightsRaw
    ? [...weightsRaw].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    : undefined;

  const utils = trpc.useUtils();
  const deleteMutation = trpc.weight.delete.useMutation({
    onSuccess: () => {
      utils.weight.getWeights.invalidate();
    },
  });

  const handleDelete = (weightId: string) => {
    // Uncomment in production:
    if (
      window.confirm("Are you sure you want to delete this weight measurement?")
    ) {
      deleteMutation.mutate({ weightId });
    }
  };

  return {
    weights,
    isLoading,
    isError,
    error,
    formatDate,
    handleDelete,
    isDeleting: deleteMutation.isPending,
  };
}
