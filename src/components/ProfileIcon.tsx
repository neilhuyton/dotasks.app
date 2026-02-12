// src/components/ProfileIcon.tsx

import { Link } from "@tanstack/react-router";
import { UserIcon } from "lucide-react";

function ProfileIcon() {
  return (
    <Link
      to="/profile"
      className="flex items-center justify-center rounded-full p-2 bg-gray-700 dark:bg-gray-700 text-white dark:text-gray-100 hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors"
      aria-label="User Profile"
      data-testid="profile-icon"
    >
      <UserIcon className="h-6 w-6" />
    </Link>
  );
}
export default ProfileIcon;
