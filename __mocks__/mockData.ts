// __mocks__/mockData.ts

export const mockLists = [
  {
    id: "list-abc-123",
    title: "My Important Projects",
    description: "Work-related stuff I must finish this month",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockTasks = [
  {
    id: "t1",
    title: "Finish report",
    isPinned: false,
    isCompleted: false,
    isCurrent: false,
  },
  {
    id: "t2",
    title: "Call client",
    isPinned: false,
    isCompleted: true,
    isCurrent: false,
  },
  {
    id: "t3",
    title: "Do laundry",
    isPinned: false,
    isCompleted: false,
    isCurrent: true,
  },
];
