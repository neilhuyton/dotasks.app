// __tests__/VerifyEmail.test.tsx
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpLink } from '@trpc/client'
import { trpc } from '../src/trpc'
import { server } from '../__mocks__/server'
import '@testing-library/jest-dom'

import { verifyEmailHandler } from '../__mocks__/handlers/verifyEmail'
import { mockUsers, type MockUser } from '../__mocks__/mockUsers'
import { TEST_VERIFICATION_TOKENS } from './test-constants'
import { useAuthStore } from '../src/store/authStore'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { createMemoryHistory } from '@tanstack/history'
import { routeTree } from '../src/router/router' // ← import your real routeTree (generated or hand-written)

describe('VerifyEmail', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: '/trpc' })],
  })

  const initialMockUsers: MockUser[] = JSON.parse(JSON.stringify(mockUsers))

  const renderVerifyEmail = async (token: string) => {
    const history = createMemoryHistory({
      initialEntries: [`/verify-email?token=${token}`],
    })

    // Create a NEW router instance with the real routeTree + custom history
    const testRouter = createRouter({
      routeTree,
      history,
      context: {
        queryClient,
        trpcClient,
      },
      defaultPreload: 'intent',
      // Add any other options your real router has (e.g. defaultComponent, notFoundComponent)
    })

    await act(async () => {
      render(
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={testRouter} />
          </QueryClientProvider>
        </trpc.Provider>,
      )
    })

    return testRouter // optional: return if you need to test navigation later
  }

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' })
  })

  beforeEach(() => {
    server.use(verifyEmailHandler)
    queryClient.clear()
    vi.clearAllMocks()
    // Reset mock users
    mockUsers.length = 0
    mockUsers.push(...JSON.parse(JSON.stringify(initialMockUsers)))
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      token: null,
      refreshToken: null,
    })
  })

  afterEach(() => {
    server.resetHandlers()
    queryClient.clear()
  })

  afterAll(() => {
    server.close()
  })

  it('successfully verifies email with valid token', async () => {
    await renderVerifyEmail(TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS)

    await waitFor(
      () => {
        expect(screen.getByText('Email Verification')).toBeInTheDocument()
        const message = screen.getByTestId('verify-message')
        expect(message).toBeInTheDocument()
        expect(message).toHaveTextContent('Email verified successfully!')
        expect(message).toHaveClass('text-green-500')
      },
      { timeout: 3000 },
    )
  })

  it('displays error message for invalid or expired verification token', async () => {
    await renderVerifyEmail(TEST_VERIFICATION_TOKENS.INVALID)

    await waitFor(
      () => {
        const message = screen.getByTestId('verify-message')
        expect(message).toBeInTheDocument()
        expect(message).toHaveTextContent('Invalid or expired verification token')
        expect(message).toHaveClass('text-red-500')
      },
      { timeout: 3000 },
    )
  })

  it('displays error message for already verified email', async () => {
    await renderVerifyEmail(TEST_VERIFICATION_TOKENS.ALREADY_VERIFIED)

    await waitFor(
      () => {
        const message = screen.getByTestId('verify-message')
        expect(message).toBeInTheDocument()
        expect(message).toHaveTextContent('Email already verified')
        expect(message).toHaveClass('text-red-500')
      },
      { timeout: 3000 },
    )
  })

  it('displays verifying message during verification process', async () => {
    await renderVerifyEmail(TEST_VERIFICATION_TOKENS.DELAYED_SUCCESS)

    await waitFor(
      () => {
        expect(screen.getByTestId('verify-email-loading')).toBeInTheDocument()
      },
      { timeout: 1000 },
    )

    await waitFor(
      () => {
        const message = screen.getByTestId('verify-message')
        expect(message).toBeInTheDocument()
        expect(message).toHaveTextContent('Email verified successfully!')
      },
      { timeout: 3000 },
    )
  })
})