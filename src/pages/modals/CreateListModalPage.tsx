// src/pages/modals/CreateListModalPage.tsx

import { listsIndexRoute } from "@/router/routes";
import CreateListModal from "@/components/modals/CreateListModal";
import { trpc } from "@/trpc";
import { useAuthStore } from "@/store/authStore";

export default function CreateListModalPage() {
  const navigate = listsIndexRoute.useNavigate();
  const { userId } = useAuthStore();

  const utils = trpc.useUtils();

  const createList = trpc.list.create.useMutation({
    onMutate: async (input) => {
      await utils.list.getAll.cancel();
      const prev = utils.list.getAll.getData() ?? [];
      const optimistic = {
        id: `temp-${crypto.randomUUID()}`,
        title: input.title,
        description: input.description ?? null,
        color: input.color ?? null,
        icon: input.icon ?? null,
        userId: userId ?? "", // fallback if not available
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
      };
      utils.list.getAll.setData(undefined, [...prev, optimistic]);
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) utils.list.getAll.setData(undefined, ctx.prev);
    },
    onSuccess: (newList) => {
      utils.list.getAll.setData(undefined, (old = []) =>
        old.map((l) => (l.id.startsWith("temp-") ? newList : l)),
      );
      navigate({ to: "/lists", replace: true });
    },
  });

  const handleCreate = (data: {
    title: string;
    description?: string;
    color?: string;
    icon?: string;
  }) => {
    createList.mutate(data);
  };

  const handleClose = () => {
    navigate({ to: "/lists", replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-border">
        <CreateListModal
          isOpen={true}
          onClose={handleClose}
          onCreate={handleCreate}
          isPending={createList.isPending}
        />
      </div>
    </div>
  );
}
