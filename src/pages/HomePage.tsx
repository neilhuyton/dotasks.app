import { useHomePage } from '@/hooks/useHomePage';
import { Loader2 } from 'lucide-react';

import EmptyLists from '@/components/EmptyLists';
import TaskCreation from '@/components/TaskCreation';
import TaskList from '@/components/TaskList';

export default function HomePage() {
  const {
    isAuth,
    listsLoading,
    optimisticLists,
    optimisticTasks,
    activeList,
    activeListId,
    createList,
    createListPending,
    createTask,
    createTaskPending,
    toggleTask,
    toggleTaskPending,
  } = useHomePage();

  if (!isAuth || listsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (optimisticLists.length === 0) {
    return <EmptyLists createList={createList} isPending={createListPending} />;
  }

  if (!activeListId || !activeList) {
    return <div className="p-8 text-center text-xl">Select a list to begin</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold">{activeList.title}</h1>

      <TaskCreation
        createTask={createTask}
        isPending={createTaskPending}
        listId={activeListId}
        taskCount={optimisticTasks.length}
      />

      <TaskList
        tasks={optimisticTasks}
        toggleTask={toggleTask}
        isToggling={toggleTaskPending}
      />
    </div>
  );
}