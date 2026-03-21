import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpcMsw } from '../../../__mocks__/trpcMsw'
import { server } from '../../../__mocks__/server'
import { useListReorder } from '@/hooks/list/useListReorder'
import { TRPCProvider } from '@/trpc'
import { trpcClient } from '@/trpc'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/../server/trpc'

type List = inferRouterOutputs<AppRouter>['list']['getAll'][number]

const mockShowBanner = vi.fn()

vi.mock('@steel-cut/steel-lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@steel-cut/steel-lib')>()
  return {
    ...actual,
    useBannerStore: () => ({
      show: mockShowBanner,
    }),
  }
})

describe('useListReorder', () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )

  const listsQueryKey = ['list', 'getAll']

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    server.resetHandlers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
    queryClient.clear()
  })

  const initialLists: List[] = [
    {
      id: 'a',
      title: 'A',
      description: null,
      color: null,
      icon: null,
      order: 0,
      isPinned: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      _count: { tasks: 0 },
      tasks: [],
    },
    {
      id: 'b',
      title: 'B',
      description: null,
      color: null,
      icon: null,
      order: 1,
      isPinned: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      _count: { tasks: 0 },
      tasks: [],
    },
    {
      id: 'c',
      title: 'C',
      description: null,
      color: null,
      icon: null,
      order: 2,
      isPinned: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      _count: { tasks: 0 },
      tasks: [],
    },
  ]

  it.skip('optimistically reorders lists in cache and sets pending state', async () => {
    queryClient.setQueryData(listsQueryKey, initialLists)

    const { result } = renderHook(() => useListReorder(), { wrapper })

    const updates = [
      { id: 'c', order: 0 },
      { id: 'a', order: 1 },
      { id: 'b', order: 2 },
    ]

    act(() => {
      result.current.updateListOrder(updates)
    })

    await waitFor(() => {
      const cache = queryClient.getQueryData<List[]>(listsQueryKey)
      expect(cache?.map(l => l.id)).toEqual(['c', 'a', 'b'])
    })

    const cacheAfter = queryClient.getQueryData<List[]>(listsQueryKey)
    expect(cacheAfter?.map(l => ({ id: l.id, order: l.order }))).toEqual([
      { id: 'c', order: 0 },
      { id: 'a', order: 1 },
      { id: 'b', order: 2 },
    ])

    expect(result.current.pendingReorder?.map(l => ({ id: l.id, order: l.order }))).toEqual([
      { id: 'c', order: 0 },
      { id: 'a', order: 1 },
      { id: 'b', order: 2 },
    ])
  })

  it('rolls back cache on error and shows error banner', async () => {
    server.use(
      trpcMsw.list.reorder.mutation(() => {
        throw new Error('reorder failed')
      }),
    )

    queryClient.setQueryData(listsQueryKey, initialLists)

    const { result } = renderHook(() => useListReorder(), { wrapper })

    act(() => {
      result.current.updateListOrder([{ id: 'b', order: 0 }])
    })

    await vi.waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to reorder lists',
          variant: 'error',
          duration: 4000,
        }),
      )
    })

    const cacheAfter = queryClient.getQueryData<List[]>(listsQueryKey)
    expect(cacheAfter).toEqual(initialLists)
  })

  it('clears pending state and invalidates query on success', async () => {
    server.use(
      trpcMsw.list.reorder.mutation(async () => ({
        success: true,
        updated: [{ id: 'a', order: 2 }],
      })),
    )

    queryClient.setQueryData(listsQueryKey, initialLists)

    const { result } = renderHook(() => useListReorder(), { wrapper })

    await act(async () => {
      result.current.updateListOrder([{ id: 'a', order: 2 }])
    })

    await vi.waitFor(() => {
      expect(result.current.pendingReorder).toBeNull()
      expect(result.current.isReordering).toBe(false)
    })

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Lists reordered',
        variant: 'success',
        duration: 2000,
      }),
    )
  })

  it('sets isReordering true during mutation, false after', async () => {
    let resolveMutation!: (value: { success: boolean; updated: { id: string; order: number }[] }) => void

    server.use(
      trpcMsw.list.reorder.mutation(() => new Promise(resolve => {
        resolveMutation = resolve
      })),
    )

    const { result } = renderHook(() => useListReorder(), { wrapper })

    expect(result.current.isReordering).toBe(false)

    act(() => {
      result.current.updateListOrder([{ id: 'c', order: 1 }])
    })

    await waitFor(() => {
      expect(result.current.isReordering).toBe(true)
    })

    await act(async () => {
      resolveMutation({ success: true, updated: [{ id: 'c', order: 1 }] })
    })

    await vi.waitFor(() => {
      expect(result.current.isReordering).toBe(false)
    })
  })
})