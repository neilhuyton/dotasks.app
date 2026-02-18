import type { RouterOutputs } from "@/trpc";

export type Task = RouterOutputs["task"]["getByList"][number];