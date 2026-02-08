// __tests__/trpc.test.tsx
import { describe, it, expect, vi } from "vitest";

// Create a mock function for createTRPCReact
const mockCreateTRPCReact = vi.fn().mockReturnValue({
  createClient: vi.fn(),
  Provider: vi.fn(),
});

// Mock @trpc/react-query at the top level
vi.mock("@trpc/react-query", () => {
  return {
    createTRPCReact: mockCreateTRPCReact,
  };
});

describe("trpc.ts", () => {
  it("initializes trpc client with createTRPCReact and AppRouter", async () => {
    // Import trpc after mocking
    const { trpc } = await import("../src/trpc");

    // Verify trpc is defined and an object
    expect(trpc).toBeDefined();
    expect(typeof trpc).toBe("object");

    // Verify createTRPCReact was called
    expect(mockCreateTRPCReact).toHaveBeenCalled();

    // Verify expected properties exist
    expect(trpc).toHaveProperty("createClient");
    expect(trpc).toHaveProperty("Provider");

    // Verify methods are functions
    expect(typeof trpc.createClient).toBe("function");
    expect(typeof trpc.Provider).toBe("function");
  });
});