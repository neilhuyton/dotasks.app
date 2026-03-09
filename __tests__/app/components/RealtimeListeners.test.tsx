// __tests__/app/components/RealtimeListeners.test.tsx

import { RealtimeListeners } from "@/components/RealtimeListeners";
import { useListRealtime } from "@/hooks/useListRealtime";
import { render } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

vi.mock("@/hooks/useListRealtime", () => ({
  useListRealtime: vi.fn(),
}));

describe("RealtimeListeners", () => {
  it('calls useListRealtime("todolist") and renders nothing', () => {
    const { container } = render(<RealtimeListeners />);

    expect(vi.mocked(useListRealtime)).toHaveBeenCalledWith(
      expect.objectContaining({ table: "todolist" }),
    );
    expect(container.firstChild).toBeNull();
  });
});
