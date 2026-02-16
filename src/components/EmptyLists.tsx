// src/components/EmptyLists.tsx

import { Plus } from "lucide-react";

type Props = {
  onCreate: () => void;
  isPending: boolean;
};

export default function EmptyLists({ onCreate, isPending }: Props) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 p-6 text-center">
      <h1 className="text-4xl font-bold">Get Started</h1>
      <p className="text-xl text-muted-foreground max-w-md">
        Create your first list to start organizing tasks
      </p>

      <button
        onClick={onCreate}
        disabled={isPending}
        className="flex items-center gap-3 px-8 py-4 text-xl font-medium bg-primary/10 text-primary rounded-xl hover:bg-primary/20 disabled:opacity-60 transition"
      >
        <Plus size={24} />
        Create Your First List
      </button>
    </div>
  );
}