// src/app/components/ProfileIcon.tsx

import { Link } from "@tanstack/react-router";
import { UserIcon } from "lucide-react";

function ProfileIcon() {
  return (
    <Link
      to="/profile"
      className={`
        flex items-center justify-center 
        rounded-full 
        p-1.5
        bg-gray-700 
        dark:bg-gray-700 
        text-white 
        dark:text-gray-100 
        hover:bg-gray-600 
        dark:hover:bg-gray-600 
        transition-colors
        focus:outline-none 
        focus:ring-2 
        focus:ring-ring 
        focus:ring-offset-2 
        focus:ring-offset-background
      `}
      aria-label="User Profile"
      data-testid="profile-icon"
    >
      <UserIcon className="h-5 w-5" />
    </Link>
  );
}

export default ProfileIcon;
