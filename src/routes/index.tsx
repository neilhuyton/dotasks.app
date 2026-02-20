// src/routes/index.tsx

import { createFileRoute, Link } from '@tanstack/react-router';
import { Pin, PinOff, Plus } from 'lucide-react';
import { trpc } from '@/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/PageContainer';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const { data: pinnedLists = [], isLoading } = trpc.list.getPinned.useQuery();

  const utils = trpc.useUtils();
  const togglePin = trpc.list.pin.useMutation({
    onMutate: async ({ id }) => {
      await utils.list.getPinned.cancel();
      await utils.list.getAll.cancel();

      const prevPinned = utils.list.getPinned.getData() ?? [];
      const prevAll = utils.list.getAll.getData() ?? [];

      utils.list.getPinned.setData(undefined, prevPinned.filter(l => l.id !== id));
      utils.list.getAll.setData(undefined, prevAll.map(l =>
        l.id === id ? { ...l, isPinned: false } : l
      ));

      return { prevPinned, prevAll };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) {
        utils.list.getPinned.setData(undefined, ctx.prevPinned);
        utils.list.getAll.setData(undefined, ctx.prevAll);
      }
    },
    onSettled: () => {
      utils.list.getPinned.invalidate();
      utils.list.getAll.invalidate();
    },
  });

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/lists">
            <Plus className="mr-2 h-4 w-4" />
            New List
          </Link>
        </Button>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            <Pin className="h-6 w-6 text-amber-600" fill="currentColor" />
            Pinned Lists
          </h2>

          {pinnedLists.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/lists">View all lists →</Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : pinnedLists.length === 0 ? (
          <Card className="bg-muted/40 border-dashed">
            <CardContent className="py-12 text-center space-y-4">
              <Pin className="mx-auto h-10 w-10 text-muted-foreground/70" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">No pinned lists yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Pin your most important lists to access them quickly from the dashboard.
                </p>
              </div>
              <Button variant="secondary" asChild>
                <Link to="/lists">Go to Lists</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pinnedLists.map((list) => {
              const activeCount = list.tasks?.length ?? 0;
              const progress =
                list._count.tasks > 0
                  ? Math.round(((list._count.tasks - activeCount) / list._count.tasks) * 100)
                  : 0;

              return (
                <Card
                  key={list.id}
                  className={cn(
                    "group relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5",
                    list.color && "border-l-4",
                  )}
                  style={list.color ? { borderLeftColor: list.color } : undefined}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => togglePin.mutate({ id: list.id })}
                    disabled={togglePin.isPending}
                    title="Unpin list"
                  >
                    <PinOff className="h-4 w-4" />
                  </Button>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold leading-tight pr-10 line-clamp-2">
                      <Link
                        to="/lists/$listId"
                        params={{ listId: list.id }}
                        className="hover:underline"
                      >
                        {list.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4 text-sm">
                    {list.description && (
                      <p className="text-muted-foreground line-clamp-2">
                        {list.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">
                        {list._count.tasks} task{list._count.tasks !== 1 ? 's' : ''}
                      </span>
                      <span>{activeCount} active</span>
                    </div>

                    {list._count.tasks > 0 && (
                      <div className="mt-1">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-right mt-1 text-muted-foreground">
                          {progress}% complete
                        </div>
                      </div>
                    )}

                    {list.tasks?.length > 0 && (
                      <ul className="text-xs space-y-1.5 mt-3 pt-3 border-t">
                        {list.tasks.map((task) => (
                          <li key={task.id} className="flex items-center gap-2">
                            <div
                              className={cn(
                                "size-2.5 rounded-full flex-shrink-0",
                                task.isCompleted ? "bg-green-500" : "bg-amber-400"
                              )}
                            />
                            <span className="line-clamp-1 text-muted-foreground">
                              {task.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {list.icon && (
                      <div className="absolute bottom-3 right-3 text-3xl opacity-30 pointer-events-none">
                        {list.icon}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </PageContainer>
  );
}