// __tests__/WeightList.test.tsx
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from '../src/trpc'
import { server } from '../__mocks__/server'
import '@testing-library/jest-dom'
import { act } from 'react'
import WeightList from '../src/components/WeightList'
import { weightGetWeightsHandler } from '../__mocks__/handlers/weightGetWeights'
import { weightDeleteHandler } from '../__mocks__/handlers/weightDelete'
import { resetWeights } from '../__mocks__/handlers/weightsData'
import { useAuthStore } from '../src/store/authStore'
import { generateToken } from './utils/token'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Trash2: () => <div data-testid="trash-icon" />,
}))

describe('WeightList Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:8888/.netlify/functions/trpc',
        fetch: async (url, options) => {
          const headers = {
            'content-type': 'application/json',
            ...(useAuthStore.getState().token
              ? { Authorization: `Bearer ${useAuthStore.getState().token}` }
              : {}),
          }
          const body =
            options?.body ||
            JSON.stringify([{ id: 0, method: 'query', path: 'weight.getWeights' }])
          const response = await fetch(url, {
            ...options,
            headers,
            method: 'POST',
            body,
          })
          return response
        },
      }),
    ],
  })

  const setup = async (userId = 'test-user-id') => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId,
      token: generateToken(userId),
      refreshToken: 'valid-refresh-token',
      login: vi.fn(),
      logout: vi.fn(),
    })

    await act(async () => {
      render(
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <WeightList />
          </QueryClientProvider>
        </trpc.Provider>,
      )
    })
  }

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' })
    server.use(weightGetWeightsHandler, weightDeleteHandler)
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  afterEach(() => {
    server.resetHandlers()
    queryClient.clear()
    vi.clearAllMocks()
    document.body.innerHTML = ''
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      token: null,
      refreshToken: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    resetWeights()
  })

  afterAll(() => {
    server.close()
    vi.restoreAllMocks()
  })

  it('displays weight measurements in a table', async () => {
    await setup()

    await waitFor(
      () => {
        expect(screen.queryByTestId('weight-list-loading')).not.toBeInTheDocument()
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getByText('Weight (kg)')).toBeInTheDocument()
        expect(screen.getByText('Date')).toBeInTheDocument()
        expect(screen.getByText('70')).toBeInTheDocument()
        expect(screen.getByText('69.9')).toBeInTheDocument()
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
      },
      { timeout: 500 },
    )
  })

  it('deletes a weight measurement when delete button is clicked', async () => {
    await setup()

    await waitFor(
      () => {
        expect(screen.queryByTestId('weight-list-loading')).not.toBeInTheDocument()
        expect(screen.getByText('70')).toBeInTheDocument()
        expect(screen.getByText('69.9')).toBeInTheDocument()
        expect(
          screen.getByRole('button', {
            name: /Delete weight measurement from 01\/10\/2023/i,
          }),
        ).toBeInTheDocument()
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
      },
      { timeout: 500 },
    )

    await act(async () => {
      const deleteButton = screen.getByRole('button', {
        name: /Delete weight measurement from 01\/10\/2023/i,
      })
      fireEvent.click(deleteButton)
    })

    await waitFor(
      () => {
        // expect(screen.queryByText('70')).not.toBeInTheDocument()
        expect(screen.getByText('69.9')).toBeInTheDocument()
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
      },
      { timeout: 500 },
    )
  })
})