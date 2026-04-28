import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { renderWithProviders } from "../utils/test-helpers"
import { APP_CONFIG } from "@/appConfig"

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router")
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  }
})

vi.mock("lucide-react", () => ({
  Plus: () => <span data-testid="icon-plus" />,
  ListTodo: () => <span data-testid="icon-list-todo" />,
  LogIn: () => <span data-testid="icon-login" />,
  UserPlus: () => <span data-testid="icon-user-plus" />,
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => (
    <button data-testid="mock-button" {...props}>
      {children}
    </button>
  ),
}))

describe("Landing Page (/)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderLandingPage = () => renderWithProviders()

  it("renders main heading with app name", async () => {
    renderLandingPage()
    await screen.findByText(APP_CONFIG.appName)
  })

  it("renders tagline", async () => {
    renderLandingPage()
    await screen.findByText(/Simple, focused task management/i)
  })

  it("renders Sign Up and Log In links", async () => {
    renderLandingPage()

    await waitFor(() => {
      const signUp = screen.getByText("Sign Up – It's Free")
      const login = screen.getByText("Log In")

      expect(signUp.closest("a")).toHaveAttribute("href", "/register")
      expect(login.closest("a")).toHaveAttribute("href", "/login")
    })
  })

  it("renders the three feature sections", async () => {
    renderLandingPage()

    await waitFor(() => {
      screen.getByText("Organize Lists")
      screen.getByText("Quick Add")
      screen.getByText("Track Progress")
    })
  })

  it("renders footer CTA link", async () => {
    renderLandingPage()

    await waitFor(() => {
      const cta = screen.getByText("Create Your First List →")
      expect(cta.closest("a")).toHaveAttribute("href", "/register")
    })
  })
})