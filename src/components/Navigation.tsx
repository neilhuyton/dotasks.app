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
      className="relative flex flex-1 flex-col items-center py-3 text-sm font-medium text-muted-foreground hover:bg-muted/70 sm:text-base transition-colors"
      activeProps={{
        className:
          "font-semibold text-foreground bg-muted/50 before:absolute before:left-0 before:right-0 before:top-0 before:h-1 before:bg-primary",
      }}
      activeOptions={{ exact }}
      aria-label={label}
    >
      <Icon className="mb-1 h-6 w-6 sm:h-7 sm:w-7" />
      {label}
    </Link>
  );
}

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-md justify-around">
        <NavItem to="/dashboard" label="Today" Icon={ListTodo} exact={true} />
        <NavItem to="/lists" label="Lists" Icon={ListChecks} exact={false} />
        <NavItem to="/profile" label="Me" Icon={User} exact={true} />
      </div>
    </nav>
  );
}
