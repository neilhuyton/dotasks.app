// __tests__/router.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/router/types/routeTree.gen', () => ({
  routeTree: {} satisfies Record<string, unknown>,
}))

vi.mock('@/app/components/RouteError', () => ({
  RouteError: vi.fn(),
}))

describe('router creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports a router instance', async () => {
    const { router } = await import('@/router')
    expect(router).toBeDefined()
    expect(typeof router).toBe('object')
  })

  it('sets defaultPreload = intent', async () => {
    const { router } = await import('@/router')
    expect(router.options.defaultPreload).toBe('intent')
  })

  it('sets defaultErrorComponent', async () => {
    const { router } = await import('@/router')
    const errorComp = router.options.defaultErrorComponent
    expect(errorComp).toBeDefined()
    expect(typeof errorComp).toBe('function')
  })

  it('satisfies Register.router augmentation', async () => {
    const { router } = await import('@/router')
    interface Register {
      router: typeof router
    }
    const check: Register = { router }
    expect(check.router).toBe(router)
  })
})