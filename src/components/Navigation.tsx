// src/components/Navigation.tsx

import { Link } from "@tanstack/react-router";
import { ListTodo, ListChecks, User } from "lucide-react";

interface NavItemProps {
  to: string;
  label: string;
  Icon: typeof ListTodo;
  exact?: boolean;
}

function NavItem({ to, label, Icon, exact = true }: NavItemProps) {
  return (
    <Link
      to={to}
      className="relative flex flex-1 flex-col items-center justify-center py-1.5 px-1 text-[0.6875rem] font-medium text-muted-foreground hover:bg-muted/70 active:bg-muted/80 transition-colors duration-150"
      activeProps={{
        className: "font-semibold text-foreground bg-muted/50 before:absolute before:left-0 before:right-0 before:top-0 before:h-1 before:bg-primary",
      }}
      activeOptions={{ exact }}
      aria-label={label}
    >
      <Icon className="mb-0.5 h-5 w-5 sm:h-5.5 sm:w-5.5" />
      <span className="mt-0.5">{label}</span>
    </Link>
  );
}

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="flex justify-around items-center w-full h-12 px-0">
        {/* ← px-0 important! No side padding */}
        <NavItem to="/dashboard" label="Dashboard" Icon={ListTodo} exact={true} />
        <NavItem to="/lists" label="Lists" Icon={ListChecks} exact={false} />
        <NavItem to="/profile" label="Me" Icon={User} exact={true} />
      </div>
    </nav>
  );
}