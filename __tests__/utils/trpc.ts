// __tests__/utils/trpc.ts

import { QueryClient } from '@tanstack/react-query'
import { httpLink } from '@trpc/client'
import { trpc } from '../../src/trpc'

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

export const createTestTrpcClient = () =>
  trpc.createClient({
    links: [httpLink({ url: '/trpc' })],
  })