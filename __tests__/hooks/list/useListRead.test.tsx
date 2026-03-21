import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpcMsw } from '../../../__mocks__/trpcMsw'
import { server } from '../../../__mocks__/server'
import { useListRead } from '@/hooks/list/useListRead'
import { TRPCProvider } from '@/trpc'
import { trpcClient } from '@/trpc'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../server/trpc'

type List = inferRouterOutputs<AppRouter>['list']['getAll'][number]

describe('useListRead', () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
      },
    })
    server.resetHandlers()
  })

  afterEach(() => {
    server.resetHandlers()
    queryClient.clear()
  })

  it('returns empty array when no lists exist', async () => {
    server.use(trpcMsw.list.getAll.query(() => []))

    const { result } = renderHook(() => useListRead(), { wrapper })

    await waitFor(() => {
      expect(result.current.lists).toEqual([])
    })
  })

  it('returns lists when data exists', async () => {
    const mockLists: List[] = [
      {
        id: 'l1',
        title: 'Groceries',
        description: null,
        color: null,
        icon: null,
        order: 0,
        isPinned: false,
        createdAt: '2025-10-01T10:00:00.000Z',
        updatedAt: '2025-10-01T10:00:00.000Z',
        _count: { tasks: 3 },
        tasks: [],
      },
      {
        id: 'l2',
        title: 'Work',
        description: 'Project tasks',
        color: '#3b82f6',
        icon: 'briefcase',
        order: 1,
        isPinned: true,
        createdAt: '2025-10-02T09:00:00.000Z',
        updatedAt: '2025-10-03T14:30:00.000Z',
        _count: { tasks: 8 },
        tasks: [],
      },
    ]

    server.use(trpcMsw.list.getAll.query(() => mockLists))

    const { result } = renderHook(() => useListRead(), { wrapper })

    await waitFor(() => {
      expect(result.current.lists).toEqual(mockLists)
    })

    expect(result.current.lists).toHaveLength(2)
    expect(result.current.lists[0].title).toBe('Groceries')
    expect(result.current.lists[1].isPinned).toBe(true)
  })

  it('exposes correct query key', async () => {
    server.use(trpcMsw.list.getAll.query(() => []))

    const { result } = renderHook(() => useListRead(), { wrapper })

    await waitFor(() => {
      expect(result.current.listsQueryKey).toEqual([
        ['list', 'getAll'],
        { type: 'query' },
      ])
    })
  })

  it('respects configured staleTime and gcTime', async () => {
    server.use(trpcMsw.list.getAll.query(() => []))

    const { result } = renderHook(() => useListRead(), { wrapper })

    await waitFor(() => result.current.lists.length >= 0)

    const query = queryClient.getQueryCache().find({
      queryKey: [['list', 'getAll'], { type: 'query' }],
    })

    expect(query).toBeDefined()
    expect(query!.observers[0].options.staleTime).toBe(30 * 60 * 1000)
    expect(query!.observers[0].options.gcTime).toBe(24 * 60 * 60 * 1000)
  })
})