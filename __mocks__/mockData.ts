// __mocks__/mockData.ts
// (you can expand this later with more realistic mock data)

export const mockLists = [
  {
    id: "list-abc-123",
    title: "My Important Projects",
    description: "Work-related stuff I must finish this month",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // add other fields if your List type requires them (userId, color, etc.)
  },
  // more lists if needed for other tests
];

export const mockTasks = [
  {
    id: "t1",
    title: "Finish report",
    isCompleted: false,
    isCurrent: false,
    // add description, dueDate, etc. if your Task type has them
  },
  {
    id: "t2",
    title: "Call client",
    isCompleted: true,
    isCurrent: false,
  },
  {
    id: "t3",
    title: "Do laundry",
    isCompleted: false,
    isCurrent: true,
  },
];
