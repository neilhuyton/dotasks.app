// __tests__/server/routers/todo/task.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";

import {
  createProtectedCaller,
  resetPrismaMocks,
  mockPrisma,
} from "../../../utils/testCaller";

describe("task router (protected procedures)", () => {
  let caller: ReturnType<typeof createProtectedCaller>;

  beforeEach(() => {
    caller = createProtectedCaller();
    resetPrismaMocks();
  });

  describe("getByList", () => {
    it("returns all tasks for a list the user owns", async () => {
      const listId = crypto.randomUUID();

      mockPrisma.todoList.count.mockResolvedValue(1);

      const mockTasks = [
        {
          id: crypto.randomUUID(),
          listId,
          title: "Buy milk",
          description: null,
          dueDate: null,
          priority: 0,
          order: 0,
          isCompleted: false,
          isCurrent: true,
          isPinned: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          listId,
          title: "Call mom",
          description: "Ask about dinner plans",
          dueDate: new Date("2026-02-20"),
          priority: 3,
          order: 1,
          isCompleted: false,
          isCurrent: false,
          isPinned: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      const result = await caller.task.getByList({ listId });

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: "Buy milk", isCurrent: true }),
          expect.objectContaining({ title: "Call mom" }),
        ]),
      );
    });

    it("throws NOT_FOUND when list does not exist or is not owned", async () => {
      const listId = crypto.randomUUID();

      mockPrisma.todoList.count.mockResolvedValue(0);

      await expect(caller.task.getByList({ listId })).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "List not found",
      });
    });

    it("throws BAD_REQUEST for invalid listId format", async () => {
      await expect(
        caller.task.getByList({ listId: "not-a-uuid" }),
      ).rejects.toThrow(/Invalid uuid/i);
    });
  });

  describe("create", () => {
    it("creates a new task in an owned list", async () => {
      const listId = crypto.randomUUID();
      const input = {
        listId,
        title: "Write report",
        description: "Q1 summary",
        dueDate: new Date("2026-03-01"),
        priority: 4,
        order: 5,
      };

      const createdTask = {
        id: crypto.randomUUID(),
        ...input,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: listId,
        userId: "test-user-id",
        title: "Test List",
        description: null,
        color: null,
        icon: null,
        order: 42,           
        isArchived: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.task.create.mockResolvedValue(createdTask);

      const result = await caller.task.create(input);

      expect(result).toMatchObject({
        title: "Write report",
        description: "Q1 summary",
        priority: 4,
        isCompleted: false,
        isCurrent: false,
      });
    });

    it("throws FORBIDDEN when trying to create in foreign list", async () => {
      const listId = crypto.randomUUID();

      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: listId,
        userId: "other-user",
        title: "Foreign List",
        description: null,
        color: null,
        icon: null,
        order: 7,                
        isArchived: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        caller.task.create({ listId, title: "Test task" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws BAD_REQUEST when title is empty", async () => {
      await expect(
        caller.task.create({
          listId: crypto.randomUUID(),
          title: "",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("title"),
      });
    });
  });

  describe("toggle", () => {
    it("toggles completion status and clears isCurrent when completing", async () => {
      const taskId = crypto.randomUUID();

      mockPrisma.task.findUnique.mockResolvedValue({
        id: taskId,
        listId: "list-123",
        title: "Sample task",
        description: null,
        dueDate: null,
        priority: 0,
        order: 0,
        isCompleted: false,
        isCurrent: true,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: "list-123",
        userId: "test-user-id",
        title: "Test List",
        description: null,
        color: null,
        icon: null,
        order: 10,               
        isArchived: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.task.update.mockResolvedValue({
        id: taskId,
        listId: "list-123",
        title: "Sample task",
        description: null,
        dueDate: null,
        priority: 0,
        order: 0,
        isCompleted: true,
        isCurrent: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await caller.task.toggle({ id: taskId });

      expect(result.isCompleted).toBe(true);
      expect(result.isCurrent).toBe(false);
    });

    it("toggles back to incomplete without touching isCurrent", async () => {
      const taskId = crypto.randomUUID();

      mockPrisma.task.findUnique.mockResolvedValue({
        id: taskId,
        listId: "list-123",
        title: "Sample task",
        description: null,
        dueDate: null,
        priority: 0,
        order: 0,
        isCompleted: true,
        isCurrent: true,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: "list-123",
        userId: "test-user-id",
        title: "Test List",
        description: null,
        color: null,
        icon: null,
        order: 10,               
        isArchived: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.task.update.mockResolvedValue({
        id: taskId,
        listId: "list-123",
        title: "Sample task",
        description: null,
        dueDate: null,
        priority: 0,
        order: 0,
        isCompleted: false,
        isCurrent: true,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await caller.task.toggle({ id: taskId });

      expect(result.isCompleted).toBe(false);
      expect(result.isCurrent).toBe(true);
    });

    it("throws NOT_FOUND when task does not exist", async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(
        caller.task.toggle({ id: crypto.randomUUID() }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Task not found",
      });
    });

    it("throws FORBIDDEN when task belongs to another user", async () => {
      const taskId = crypto.randomUUID();

      mockPrisma.task.findUnique.mockResolvedValue({
        id: taskId,
        listId: "foreign-list",
        title: "Foreign task",
        description: null,
        dueDate: null,
        priority: 0,
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: "foreign-list",
        userId: "other-user",
        title: "Foreign List",
        description: null,
        color: null,
        icon: null,
        order: 5,                
        isArchived: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(caller.task.toggle({ id: taskId })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("delete", () => {
    it("deletes a task from an owned list", async () => {
      const taskId = crypto.randomUUID();

      mockPrisma.task.findUnique.mockResolvedValue({
        id: taskId,
        listId: "list-123",
        title: "Task to delete",
        description: null,
        dueDate: null,
        priority: 0,
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: "list-123",
        userId: "test-user-id",
        title: "Test List",
        description: null,
        color: null,
        icon: null,
        order: 3,                
        isArchived: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.task.delete.mockResolvedValue({
        id: taskId,
        listId: "list-123",
        title: "Task to delete",
        description: null,
        dueDate: null,
        priority: 0,
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await caller.task.delete({ id: taskId });

      expect(result).toMatchObject({ id: taskId });
    });

    it("throws NOT_FOUND when task does not exist", async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(
        caller.task.delete({ id: crypto.randomUUID() }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN when task is in foreign list", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: crypto.randomUUID(),
        listId: "foreign",
        title: "Foreign task",
        description: null,
        dueDate: null,
        priority: 0,
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: "foreign",
        userId: "other",
        title: "Foreign List",
        description: null,
        color: null,
        icon: null,
        order: 8,                
        isArchived: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        caller.task.delete({ id: crypto.randomUUID() }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("setCurrent", () => {
    it("sets one task as current and clears others in the same list", async () => {
      const taskId = crypto.randomUUID();
      const listId = crypto.randomUUID();

      mockPrisma.task.findFirst.mockResolvedValue({
        id: taskId,
        listId,
        title: "Important task",
        description: null,
        dueDate: null,
        priority: 0,
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });

      const updatedTask = {
        id: taskId,
        listId,
        title: "Important task",
        description: null,
        dueDate: null,
        priority: 0,
        order: -1,
        isCompleted: false,
        isCurrent: true,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.task.update.mockResolvedValue(updatedTask);

      const result = await caller.task.setCurrent({ id: taskId, listId });

      expect(result).toMatchObject({
        id: taskId,
        isCurrent: true,
        order: -1,
      });

      expect(mockPrisma.task.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listId,
            isCurrent: true,
            id: { not: taskId },
          }),
          data: { isCurrent: false },
        }),
      );

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: taskId },
          data: expect.objectContaining({
            isCurrent: true,
            order: -1,
          }),
        }),
      );
    });
  });

  describe("clearCurrent", () => {
    it("clears current flag from all tasks in the list", async () => {
      const listId = crypto.randomUUID();

      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: listId,
        userId: "test-user-id",
        title: "Test List",
        description: null,
        color: null,
        icon: null,
        order: 1,                
        isArchived: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.task.updateMany.mockResolvedValue({ count: 2 });

      const result = await caller.task.clearCurrent({ listId });

      expect(result).toEqual({ success: true });

      expect(mockPrisma.task.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listId,
            isCurrent: true,
          }),
          data: { isCurrent: false },
        }),
      );
    });

    it("throws FORBIDDEN when list belongs to another user", async () => {
      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: crypto.randomUUID(),
        userId: "other-user",
        title: "Foreign List",
        description: null,
        color: null,
        icon: null,
        order: 99,               
        isArchived: false,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        caller.task.clearCurrent({ listId: crypto.randomUUID() }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});