import { useAuthStore } from "../../src/store/authStore";
import { generateToken } from "./token"; // sibling in __tests__/utils/

export const loginTestUser = (userId = "test-user-id") => {
  useAuthStore.setState({
    isLoggedIn: true,
    userId,
    accessToken: generateToken(userId),
    refreshToken: "valid-refresh-token",
  });
};

export const logoutTestUser = () => {
  useAuthStore.setState({
    isLoggedIn: false,
    userId: null,
    accessToken: null,
    refreshToken: null,
  });
};
