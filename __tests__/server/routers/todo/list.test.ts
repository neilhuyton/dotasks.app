// __tests__/server/routers/todo/list.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";

import {
  createProtectedCaller,
  resetPrismaMocks,
  mockPrisma,
} from "../../../utils/testCaller";

describe("list router (protected procedures)", () => {
  let caller: ReturnType<typeof createProtectedCaller>;

  beforeEach(() => {
    caller = createProtectedCaller();
    resetPrismaMocks();
  });

  describe("getAll", () => {
    it("returns active lists sorted by order asc", async () => {
      const mockLists = [
        {
          id: crypto.randomUUID(),
          title: "High priority",
          description: null,
          color: null,
          icon: null,
          isArchived: false,
          isPinned: false,
          order: 0,
          userId: "test-user-id",
          createdAt: new Date("2025-03-15T10:00:00Z"),
          updatedAt: new Date("2025-03-15T10:00:00Z"),
          _count: { tasks: 2 },
          tasks: [{ id: "t1", title: "Task A", isCompleted: false }],
        },
        {
          id: crypto.randomUUID(),
          title: "Older same-order item",
          description: null,
          color: null,
          icon: null,
          isArchived: false,
          isPinned: false,
          order: 5,
          userId: "test-user-id",
          createdAt: new Date("2025-01-10T09:00:00Z"),
          updatedAt: new Date("2025-01-10T09:00:00Z"),
          _count: { tasks: 0 },
          tasks: [],
        },
        {
          id: crypto.randomUUID(),
          title: "Newer same-order item",
          description: null,
          color: null,
          icon: null,
          isArchived: false,
          isPinned: false,
          order: 5,
          userId: "test-user-id",
          createdAt: new Date("2025-04-20T14:30:00Z"),
          updatedAt: new Date("2025-04-20T14:30:00Z"),
          _count: { tasks: 3 },
          tasks: [
            { id: "t2", title: "Task B", isCompleted: false },
            { id: "t3", title: "Task C", isCompleted: false },
          ],
        },
        {
          id: crypto.randomUUID(),
          title: "Medium priority",
          description: "Stuff to do soon",
          color: "#3B82F6",
          icon: "briefcase",
          isArchived: false,
          isPinned: false,
          order: 10,
          userId: "test-user-id",
          createdAt: new Date("2025-02-05T12:00:00Z"),
          updatedAt: new Date("2025-02-05T12:00:00Z"),
          _count: { tasks: 4 },
          tasks: [{ id: "t4", title: "Task D", isCompleted: false }],
        },
      ];

      const sortedMockData = [...mockLists].sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      mockPrisma.todoList.findMany.mockResolvedValue(sortedMockData);

      const result = await caller.list.getAll();

      expect(result).toHaveLength(4);

      expect(result[0].title).toBe("High priority");
      expect(result[0].order).toBe(0);

      expect(result[1].title).toBe("Newer same-order item");
      expect(result[1].order).toBe(5);

      expect(result[2].title).toBe("Older same-order item");
      expect(result[2].order).toBe(5);

      expect(result[3].title).toBe("Medium priority");
      expect(result[3].order).toBe(10);

      expect(mockPrisma.todoList.findMany).toHaveBeenCalledWith({
        where: {
          userId: "test-user-id",
          isArchived: false,
        },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          color: true,
          icon: true,
          isPinned: true,
          order: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { tasks: true },
          },
          tasks: {
            where: { isCompleted: false },
            orderBy: { order: "asc" },
            take: 3,
            select: {
              id: true,
              title: true,
              isCompleted: true,
            },
          },
        },
      });
    });

    it("returns empty array when user has no active lists", async () => {
      mockPrisma.todoList.findMany.mockResolvedValue([]);

      const result = await caller.list.getAll();

      expect(result).toEqual([]);
    });
  });

  describe("getOne", () => {
    it("returns the requested list when it belongs to the user", async () => {
      const listId = crypto.randomUUID();

      const mockList = {
        id: listId,
        title: "Groceries",
        description: "Weekend shopping",
        color: "#FF6B6B",
        icon: "shopping-cart",
        isArchived: false,
        isPinned: false,
        order: 1,
        userId: "test-user-id",
        createdAt: new Date("2025-02-10T09:30:00Z"),
        updatedAt: new Date("2025-02-10T09:30:00Z"),
      };

      mockPrisma.todoList.findUnique.mockResolvedValue(mockList);

      const result = await caller.list.getOne({ id: listId });

      expect(result).toMatchObject({
        id: listId,
        title: "Groceries",
        userId: "test-user-id",
      });
    });

    it("throws NOT_FOUND when list does not exist or belongs to another user", async () => {
      mockPrisma.todoList.findUnique.mockResolvedValue(null);

      await expect(
        caller.list.getOne({ id: crypto.randomUUID() }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("throws BAD_REQUEST for invalid UUID format", async () => {
      await expect(caller.list.getOne({ id: "not-a-uuid" })).rejects.toThrow(
        /Invalid uuid/i,
      );
    });
  });

  describe("create", () => {
    it("creates a new list with defaults and returns it", async () => {
      const input = {
        title: "Daily Goals",
        description: "Things to do every day",
      };

      const now = new Date();

      const createdList = {
        id: crypto.randomUUID(),
        ...input,
        color: null,
        icon: null,
        isArchived: false,
        isPinned: false,
        order: 0,
        userId: "test-user-id",
        createdAt: now,
        updatedAt: now,
      };

      mockPrisma.todoList.create.mockResolvedValue(createdList);

      const result = await caller.list.create(input);

      expect(result).toMatchObject({
        title: "Daily Goals",
        description: "Things to do every day",
        userId: "test-user-id",
        isArchived: false,
        isPinned: false,
        order: 0,
        color: null,
        icon: null,
      });

      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);

      expect(mockPrisma.todoList.create).toHaveBeenCalledWith({
        data: {
          title: "Daily Goals",
          description: "Things to do every day",
          userId: "test-user-id",
          order: 0,
        },
      });
    });

    it("rejects creation when title is empty or only whitespace", async () => {
      await expect(caller.list.create({ title: "   " })).rejects.toThrow(
        /Title cannot be empty/i,
      );
      await expect(caller.list.create({ title: "" })).rejects.toThrow(
        /Title cannot be empty/i,
      );
    });
  });

  describe("delete", () => {
    it("deletes an owned list and returns the deleted record", async () => {
      const listId = crypto.randomUUID();

      const existingList = {
        id: listId,
        title: "Groceries",
        description: "Weekend shopping",
        color: "#FF6B6B",
        icon: "shopping-cart",
        isArchived: false,
        isPinned: false,
        order: 1,
        userId: "test-user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.todoList.findUnique.mockResolvedValue(existingList);
      mockPrisma.todoList.delete.mockResolvedValue(existingList);

      const result = await caller.list.delete({ id: listId });

      expect(result).toMatchObject({
        id: listId,
        title: "Groceries",
        userId: "test-user-id",
      });
    });

    it("throws NOT_FOUND when trying to delete non-owned or non-existent list", async () => {
      mockPrisma.todoList.findUnique.mockResolvedValue(null);

      await expect(
        caller.list.delete({ id: crypto.randomUUID() }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("throws BAD_REQUEST for invalid UUID", async () => {
      await expect(caller.list.delete({ id: "invalid-id" })).rejects.toThrow(
        /Invalid uuid/i,
      );
    });
  });
});
