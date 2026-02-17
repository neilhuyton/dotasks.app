// __tests__/pages/ConfirmResetPasswordPage.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpLink } from "@trpc/client"
import { trpc } from "../../src/trpc"
import { server } from "../../__mocks__/server"
import "@testing-library/jest-dom"

import { resetPasswordConfirmHandler } from "../../__mocks__/handlers/resetPasswordConfirm"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { router } from "../../src/router/router"

describe("ConfirmResetPasswordPage", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "/trpc" })],
  })

  const renderConfirmReset = (token = "123e4567-e89b-12d3-a456-426614174000") => {
    const history = createMemoryHistory({
      initialEntries: [`/confirm-reset-password?token=${token}`],
    })

    const testRouter = createRouter({
      routeTree: router.routeTree,
      history,
      context: {
        queryClient,
        trpcClient,
      },
      defaultPreload: "intent",
    })

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={testRouter} />
        </QueryClientProvider>
      </trpc.Provider>
    )

    return testRouter
  }

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" })
  })

  beforeEach(() => {
    server.use(resetPasswordConfirmHandler)
    queryClient.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
    queryClient.clear()
  })

  afterAll(() => {
    server.close()
  })

  it("renders form when valid token is provided", async () => {
    renderConfirmReset()

    await waitFor(() => {
      expect(screen.getByTestId("confirm-reset-password-form")).toBeInTheDocument()
      expect(screen.getByTestId("password-input")).toBeInTheDocument()
      expect(screen.getByTestId("reset-password-button")).toBeInTheDocument()
    })
  })

  it("submits valid token and new password and displays success message", async () => {
    renderConfirmReset()

    await waitFor(() => screen.getByTestId("password-input"))

    const passwordInput = screen.getByTestId("password-input")
    await userEvent.type(passwordInput, "newSecurePassword123")

    const form = screen.getByTestId("confirm-reset-password-form")
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    )

    await waitFor(
      () => {
        const message = screen.getByTestId("confirm-reset-password-message")
        expect(message).toBeInTheDocument()
        expect(message).toHaveTextContent(/successfully/i)
        expect(message).toHaveClass("text-green-500")
      },
      { timeout: 3000 }
    )
  })

  it("shows invalid token message when no token is provided", async () => {
    renderConfirmReset("")  // empty token

    await waitFor(() => {
      expect(screen.getByText("Invalid or missing token")).toBeInTheDocument()
      expect(screen.getByText("Please request a new password reset link.")).toBeInTheDocument()
      expect(screen.getByText("Reset Password")).toBeInTheDocument()
    })
  })
})