// src/components/Navigation.tsx

import { Link } from '@tanstack/react-router';
import { ListTodo, ListChecks, User } from 'lucide-react';

interface NavItemProps {
  to: string;
  label: string;
  Icon: typeof ListTodo;
}

function NavItem({ to, label, Icon }: NavItemProps) {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center py-3 text-sm font-medium hover:bg-muted sm:text-base"
      activeProps={{
        className:
          'font-semibold bg-muted before:absolute before:left-0 before:right-0 before:top-0 before:h-1 before:bg-primary',
      }}
      aria-label={label}
    >
      <Icon className="mb-1 h-6 w-6 sm:h-7 sm:w-7" />
      {label}
    </Link>
  );
}

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="mx-auto flex max-w-md justify-around">
        <NavItem to="/" label="Today" Icon={ListTodo} />
        <NavItem to="/lists" label="Lists" Icon={ListChecks} /> {/* placeholder */}
        <NavItem to="/profile" label="Me" Icon={User} />
      </div>
    </nav>
  );
}