// __mocks__/handlers/index.ts
import { verifyEmailHandler } from './verifyEmail';
import { forgotPasswordHandler } from './forgotPassword';
import { resetPasswordConfirmHandler } from './resetPasswordConfirm';
import { resetPasswordRequestHandler } from './resetPasswordRequest';
import { registerHandler } from './register';
import { loginHandler } from './login';
import { weightCreateHandler } from './weightCreate';
import { weightDeleteHandler } from './weightDelete';
import { weightGetWeightsHandler } from './weightGetWeights';
import { weightGetCurrentGoalHandler } from './weightGetCurrentGoal';
import { weightSetGoalHandler } from './weightSetGoal';
import { weightUpdateGoalHandler } from './weightUpdateGoal';
import { weightGetGoalsHandler } from './weightGetGoals';
import { refreshTokenHandler } from './refreshToken';

export const handlers = [
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordConfirmHandler,
  resetPasswordRequestHandler,
  registerHandler,
  loginHandler,
  weightCreateHandler,
  weightDeleteHandler,
  weightGetWeightsHandler,
  weightGetCurrentGoalHandler,
  weightSetGoalHandler,
  weightUpdateGoalHandler,
  weightGetGoalsHandler,
  refreshTokenHandler,
];

export {
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordConfirmHandler,
  resetPasswordRequestHandler,
  registerHandler,
  loginHandler,
  weightCreateHandler,
  weightDeleteHandler,
  weightGetWeightsHandler,
  weightGetCurrentGoalHandler,
  weightSetGoalHandler,
  weightUpdateGoalHandler,
  weightGetGoalsHandler,
  refreshTokenHandler,
};