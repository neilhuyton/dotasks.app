// __tests__/routes/reset-password.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpLink } from "@trpc/client"
import { trpc } from "../../src/trpc"
import { server } from "../../__mocks__/server"
import "@testing-library/jest-dom"

import { resetPasswordRequestHandler } from "../../__mocks__/handlers/resetPasswordRequest"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { router } from "../../src/router/router"

describe("ResetPasswordPage", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "/trpc" })],
  })

  const renderResetPassword = () => {
    const history = createMemoryHistory({ initialEntries: ["/reset-password"] })

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

    return { testRouter, history }
  }

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" })
  })

  beforeEach(() => {
    server.use(resetPasswordRequestHandler)
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

  it("renders email input, submit button and back-to-login link", async () => {
    renderResetPassword()

    await waitFor(() => {
      expect(screen.getByTestId("email-input")).toBeInTheDocument()
      expect(screen.getByTestId("submit-button")).toBeInTheDocument()
      expect(screen.getByTestId("back-to-login-link")).toBeInTheDocument()
    })
  })

  it("submits valid email → shows success message and clears input", async () => {
    renderResetPassword()

    await waitFor(() => screen.getByTestId("email-input"))

    const emailInput = screen.getByTestId("email-input")
    await userEvent.type(emailInput, "unknown@example.com")

    const form = screen.getByTestId("reset-password-form")

    fireEvent.submit(form)

    await waitFor(
      () => {
        const message = screen.getByTestId("reset-password-message")
        expect(message).toBeInTheDocument()
        expect(message).toHaveTextContent(
          "If the email exists, a reset link has been sent."
        )
        expect(message).toHaveClass("text-green-500")
        expect(emailInput).toHaveValue("")
      },
      { timeout: 5000 }
    )
  })

  it.todo("shows client-side validation error for invalid email")
  it.todo("shows error message on server failure")
  it.todo("disables button and shows loading state during submission")
})