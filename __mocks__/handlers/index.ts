// __mocks__/handlers/index.ts

// Re-export individual handlers so the test can import them directly
export { loginHandler, refreshTokenHandler } from './auth';

export { registerHandler } from './register';

// Also re-export everything from weight for consistency
export {
  weightGetCurrentGoalHandler,
  weightUpdateGoalHandler,
  weightSetGoalHandler,
  weightGetWeightsHandler,
  weightDeleteHandler,
  weightHandlers,
  resetMockGoal,
  resetWeights,
} from './weight';

// Optional grouped array (useful for server.use(...handlers) if you want it)
// export const handlers = [
//   loginHandler,
//   refreshTokenHandler,
//   ...weightHandlers,
// ];