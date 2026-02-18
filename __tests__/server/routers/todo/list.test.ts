// __tests__/server/routers/todo/list.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';

import { createProtectedCaller, resetPrismaMocks, mockPrisma } from '../../../utils/testCaller';

describe('list router (protected procedures)', () => {
  let caller: ReturnType<typeof createProtectedCaller>;

  beforeEach(() => {
    caller = createProtectedCaller();
    resetPrismaMocks();
  });

  describe('getAll', () => {
    it('returns all todo lists for the authenticated user', async () => {
      const mockLists = [
        {
          id: crypto.randomUUID(),
          title: 'Groceries',
          userId: 'test-user-id',
          description: 'Weekend shopping',
          color: '#FF6B6B',
          icon: 'shopping-cart',
          isArchived: false,
          createdAt: new Date('2025-02-10T09:30:00Z'),
          updatedAt: new Date('2025-02-10T09:30:00Z'),
        },
        {
          id: crypto.randomUUID(),
          title: 'Work Tasks',
          userId: 'test-user-id',
          description: null,
          color: null,
          icon: null,
          isArchived: false,
          createdAt: new Date('2025-02-12T14:15:00Z'),
          updatedAt: new Date('2025-02-12T14:15:00Z'),
        },
      ];

      mockPrisma.todoList.findMany.mockResolvedValue(mockLists);

      const result = await caller.list.getAll();

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Groceries' }),
          expect.objectContaining({ title: 'Work Tasks' }),
        ]),
      );

      expect(mockPrisma.todoList.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns empty array when no lists exist', async () => {
      mockPrisma.todoList.findMany.mockResolvedValue([]);

      const result = await caller.list.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getOne', () => {
    it('returns the requested list when owned by the user', async () => {
      const listId = crypto.randomUUID();

      mockPrisma.todoList.findUnique.mockResolvedValue({
        id: listId,
        title: 'Groceries',
        userId: 'test-user-id',
        description: 'Weekend shopping',
        color: '#FF6B6B',
        icon: 'shopping-cart',
        isArchived: false,
        createdAt: new Date('2025-02-10T09:30:00Z'),
        updatedAt: new Date('2025-02-10T09:30:00Z'),
      });

      const result = await caller.list.getOne({ id: listId });

      expect(result).toMatchObject({
        id: listId,
        title: 'Groceries',
        userId: 'test-user-id',
      });
    });

    it('throws NOT_FOUND for non-existent or foreign list', async () => {
      mockPrisma.todoList.findUnique.mockResolvedValue(null);

      await expect(
        caller.list.getOne({ id: crypto.randomUUID() })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('throws BAD_REQUEST for invalid id format (real Zod)', async () => {
      await expect(
        caller.list.getOne({ id: 'invalid-uuid-format' })
      ).rejects.toThrow(/Invalid uuid/i);
    });
  });

  describe('create', () => {
    it('creates and returns a new list', async () => {
      const input = {
        title: 'Daily Goals',
        description: 'Things to do every day',
      };

      const now = new Date();

      const created = {
        id: crypto.randomUUID(),
        ...input,
        userId: 'test-user-id',
        color: null,
        icon: null,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };

      mockPrisma.todoList.create.mockResolvedValue(created);

      const result = await caller.list.create(input);

      expect(result).toMatchObject({
        title: 'Daily Goals',
        description: 'Things to do every day',
        userId: 'test-user-id',
        isArchived: false,
      });
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeInstanceOf(Date);

      expect(mockPrisma.todoList.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Daily Goals',
          description: 'Things to do every day',
          userId: 'test-user-id',
        }),
      });
    });

    it('throws BAD_REQUEST when title is whitespace only', async () => {
      await expect(
        caller.list.create({ title: '   ' })
      ).rejects.toThrow(/Title cannot be empty/i);
    });
  });

  describe('delete', () => {
    it('deletes an existing owned list and returns it', async () => {
      const listId = crypto.randomUUID();

      const existing = {
        id: listId,
        title: 'Groceries',
        userId: 'test-user-id',
        description: 'Weekend shopping',
        color: '#FF6B6B',
        icon: 'shopping-cart',
        isArchived: false,
        createdAt: new Date('2025-02-10T09:30:00Z'),
        updatedAt: new Date('2025-02-10T09:30:00Z'),
      };

      mockPrisma.todoList.findUnique.mockResolvedValue(existing);
      mockPrisma.todoList.delete.mockResolvedValue(existing);

      const result = await caller.list.delete({ id: listId });

      expect(result).toMatchObject({
        id: listId,
        title: 'Groceries',
        userId: 'test-user-id',
      });
    });

    it('throws NOT_FOUND when trying to delete non-existent list', async () => {
      mockPrisma.todoList.findUnique.mockResolvedValue(null);

      await expect(
        caller.list.delete({ id: crypto.randomUUID() })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('throws BAD_REQUEST for invalid id format (real Zod)', async () => {
      await expect(
        caller.list.delete({ id: '123-not-uuid' })
      ).rejects.toThrow(/Invalid uuid/i);
    });
  });
});