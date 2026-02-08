// __tests__/test-constants.ts

export const TEST_VERIFICATION_TOKENS = {
  /**
   * Token that triggers the artificial 1-second delay in the mock handler
   * (used to simulate realistic verification latency in success case)
   */
  DELAYED_SUCCESS: "42c6b154-c097-4a71-9b34-5b28669ea467" as const,

  /**
   * Token associated with a user who is already email-verified
   */
  ALREADY_VERIFIED: "987fcdeb-12d3-4e5a-9876-426614174000" as const,

  /**
   * Example token appearing in the resetPasswordToken field of an unverified user
   * (useful if you later write password-reset related tests)
   */
  RESET_PASSWORD_EXAMPLE: "123e4567-e89b-12d3-a456-426614174000" as const,

  /**
   * Generic non-existent / invalid token used in failure test cases
   */
  INVALID: "00000000-0000-0000-0000-000000000000" as const,
} as const;