// src/app/routes/index.tsx

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ListTodo, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header / Hero */}
      <header className="px-6 pt-16 pb-12 text-center sm:pt-24 sm:pb-20">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
          Supa Base
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Simple, focused task management. Get things done without the noise.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" asChild>
            <Link to="/register">
              <UserPlus className="mr-2 h-5 w-5" />
              Sign Up – It's Free
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">
              <LogIn className="mr-2 h-5 w-5" />
              Log In
            </Link>
          </Button>
        </div>
      </header>

      {/* Features / Middle section */}
      <section className="flex-1 px-6 py-16 sm:py-24 bg-muted/20">
        <div className="max-w-5xl mx-auto grid gap-12 md:grid-cols-3 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ListTodo className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Organize Lists</h3>
            <p className="text-muted-foreground">
              Group your tasks into personal or project lists. Keep everything
              in one place.
            </p>
          </div>

          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Quick Add</h3>
            <p className="text-muted-foreground">
              Floating action button to create tasks instantly — no friction.
            </p>
          </div>

          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Track Progress</h3>
            <p className="text-muted-foreground">
              See completed tasks, pin important lists, stay motivated.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="px-6 py-12 text-center border-t">
        <p className="text-muted-foreground mb-6">
          Ready to start getting things done?
        </p>
        <Button size="lg" variant="default" asChild>
          <Link to="/register">Create Your First List →</Link>
        </Button>
      </footer>
    </div>
  );
}
