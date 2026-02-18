// __tests__/routes/confirm-reset-password.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterEach,
  afterAll,
  beforeEach,
} from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpLink } from '@trpc/client'
import { trpc } from '@/trpc'
import { server } from '../../__mocks__/server'
import '@testing-library/jest-dom'

import {
  resetPasswordConfirmHandler,
  delayedResetPasswordConfirmHandler,
  resetPasswordConfirmInvalidTokenHandler,
} from '../../__mocks__/handlers/resetPasswordConfirm'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

describe('Confirm Reset Password (/confirm-reset-password)', () => {
  let queryClient: QueryClient
  const user = userEvent.setup()

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    })

    server.resetHandlers()
    server.use(resetPasswordConfirmHandler) // default happy path

    vi.clearAllMocks()
  })

  afterEach(async () => {
    await queryClient.cancelQueries()
    queryClient.clear()
    server.resetHandlers()
  })

  afterAll(() => server.close())

  const renderConfirmResetPage = (token?: string) => {
    const search = token ? `?token=${token}` : ''

    const history = createMemoryHistory({
      initialEntries: [`/confirm-reset-password${search}`],
    })

    const router = createRouter({
      routeTree,
      history,
      context: {
        queryClient,
        trpcClient: trpc.createClient({
          links: [httpLink({ url: 'http://localhost:8888/trpc' })],
        }),
      },
      defaultPreload: 'intent',
    })

    const navigateSpy = vi.spyOn(router, 'navigate')

    render(
      <trpc.Provider
        client={trpc.createClient({ links: [httpLink({ url: 'http://localhost:8888/trpc' })] })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </trpc.Provider>,
    )

    return { navigateSpy }
  }

  it('renders invalid token message when no token provided', async () => {
    renderConfirmResetPage()

    await screen.findByText('Invalid or missing token')
    expect(screen.getByText(/Please request a new password reset link/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reset Password' })).toBeInTheDocument()
  })

  it('renders invalid token message when token is empty', async () => {
    renderConfirmResetPage('')

    await screen.findByText('Invalid or missing token')
  })

  it('renders form when token is provided', async () => {
    renderConfirmResetPage('valid-token-123')

    await screen.findByTestId('confirm-reset-password-form')
    expect(screen.getByTestId('password-input')).toBeInTheDocument()
    expect(screen.getByTestId('reset-password-button')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/reset your password/i)
  })

  it('submits successfully, shows success message and navigates to login', async () => {
    const { navigateSpy } = renderConfirmResetPage('good-token')

    await screen.findByTestId('password-input')

    const passwordInput = screen.getByTestId('password-input')
    await user.type(passwordInput, 'VeryStrongPass456!')

    const form = screen.getByTestId('confirm-reset-password-form')
    fireEvent.submit(form)

    await waitFor(
      () => {
        const message = screen.getByTestId('confirm-reset-password-message')
        expect(message).toHaveTextContent(/successfully/i)
        expect(message).toHaveClass('text-green-500')
      },
      { timeout: 4000 },
    )

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/login' }),
    )
  })

  it('shows error message on failed reset (invalid/expired token)', async () => {
    server.use(resetPasswordConfirmInvalidTokenHandler)

    renderConfirmResetPage('expired-token')

    await screen.findByTestId('password-input')

    const passwordInput = screen.getByTestId('password-input')
    await user.type(passwordInput, 'VeryStrongPass456!')

    const form = screen.getByTestId('confirm-reset-password-form')
    fireEvent.submit(form)

    await waitFor(
      () => {
        const message = screen.getByTestId('confirm-reset-password-message')
        expect(message).toHaveTextContent(/invalid|expired/i)
        expect(message).toHaveClass('text-red-500')
      },
      { timeout: 4000 },
    )

    expect(screen.getByTestId('password-input')).toBeInTheDocument()
  })

  it('disables form inputs and button during submission', async () => {
    server.use(delayedResetPasswordConfirmHandler)

    renderConfirmResetPage('slow-token')

    await screen.findByTestId('password-input')

    const input = screen.getByTestId('password-input')
    await user.type(input, 'VeryStrongPass456!')

    const form = screen.getByTestId('confirm-reset-password-form')
    fireEvent.submit(form)

    await waitFor(
      () => {
        expect(input).toBeDisabled()
        expect(screen.getByTestId('reset-password-button')).toBeDisabled()
        expect(screen.getByTestId('reset-password-button')).toHaveTextContent('Resetting...')
        expect(screen.getByTestId('confirm-reset-password-loading')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  it('navigates to login when clicking "Back to login" link', async () => {
    const { navigateSpy } = renderConfirmResetPage('valid-token')

    await screen.findByTestId('back-to-login-link')

    await user.click(screen.getByTestId('back-to-login-link'))

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/login' }),
    )
  })
})