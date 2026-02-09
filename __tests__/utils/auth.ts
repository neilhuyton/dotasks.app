import { useAuthStore } from "../../src/store/authStore";
import { generateToken } from "./token"; // sibling in __tests__/utils/

export const loginTestUser = (userId = "test-user-id") => {
  useAuthStore.setState({
    isLoggedIn: true,
    userId,
    token: generateToken(userId),
    refreshToken: "valid-refresh-token",
  });
};

export const logoutTestUser = () => {
  useAuthStore.setState({
    isLoggedIn: false,
    userId: null,
    token: null,
    refreshToken: null,
  });
};
