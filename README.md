# DoTasks App

Text

To view keyboard shortcuts, press question mark
View keyboard shortcuts

17

Auto

See new posts

dotasks.app/
├─ **mocks**/
│ ├─ handlers/
│ │ ├─ auth.ts
│ │ ├─ forgotPassword.ts
│ │ ├─ lists.ts
│ │ ├─ profile.ts
│ │ ├─ refreshToken.ts
│ │ ├─ register.ts
│ │ ├─ resetPasswordConfirm.ts
│ │ ├─ resetPasswordRequest.ts
│ │ ├─ tasks.ts
│ │ └─ verifyEmail.ts
│ ├─ mockData.ts
│ ├─ mockUsers.ts
│ ├─ server.ts
│ └─ trpcMsw.ts
├─ **tests**/
│ ├─ components/
│ │ ├─ lists/
│ │ │ └─ ListTable.test.tsx
│ │ └─ Navigation.test.tsx
│ ├─ netlify/
│ │ └─ functions/
│ │ └─ trpc.test.ts
│ ├─ routes/
│ │ ├─ \_authenticated/
│ │ │ ├─ lists/
│ │ │ │ ├─ $listId/
│ │ │ │ │ ├─ tasks/
│ │ │ │ │ │ ├─ $taskId/
│ │ │ │ │ │ │ ├─ delete.test.tsx
│ │ │ │ │ │ │ └─ edit.test.tsx
│ │ │ │ │ │ └─ new.test.tsx
│ │ │ │ │ ├─ completed.test.tsx
│ │ │ │ │ ├─ delete.test.tsx
│ │ │ │ │ └─ edit.test.tsx
│ │ │ │ ├─ $listId.test.tsx
│ │ │ │ ├─ index.test.tsx
│ │ │ │ └─ new.test.tsx
│ │ │ └─ profile.test.tsx
│ │ ├─ confirm-rest-password.test.tsx
│ │ ├─ login.test.tsx
│ │ ├─ register.test.tsx
│ │ ├─ reset-password.test.tsx
│ │ └─ verify-email.test.tsx
│ ├─ server/
│ │ └─ routers/
│ │ ├─ todo/
│ │ │ ├─ list.test.ts
│ │ │ └─ task.test.ts
│ │ ├─ login.test.ts
│ │ ├─ refreshToken.test.tsx
│ │ ├─ register.test.ts
│ │ ├─ resetPassword.test.tsx
│ │ ├─ user.test.tsx
│ │ └─ verifyEmail.test.ts
│ ├─ utils/
│ │ ├─ test-helpers.tsx
│ │ └─ testCaller.ts
│ ├─ act-suppress.ts
│ ├─ setupTests.ts
│ ├─ test-constants.ts
│ └─ trpc.test.tsx
├─ .github/
│ └─ workflows/
│ └─ ci.yml
├─ .netlify/
│ ├─ blobs/
│ ├─ blobs-serve/
│ ├─ functions-internal/
│ ├─ functions-serve/
│ │ ├─ keep-trpc-warm/
│ │ │ ├─ netlify/
│ │ │ │ └─ functions/
│ │ │ │ └─ keep-trpc-warm.mjs
│ │ │ ├─ ***netlify-bootstrap.mjs
│ │ │ ├─ ***netlify-entry-point.mjs
│ │ │ ├─ ***netlify-telemetry.mjs
│ │ │ └─ package.json
│ │ └─ trpc/
│ │ ├─ netlify/
│ │ │ └─ functions/
│ │ │ └─ trpc.mjs
│ │ ├─ ***netlify-bootstrap.mjs
│ │ ├─ ***netlify-entry-point.mjs
│ │ ├─ ***netlify-telemetry.mjs
│ │ ├─ .env
│ │ └─ package.json
│ ├─ v1/
│ │ └─ functions/
│ └─ state.json
├─ .tanstack/
├─ .vscode/
├─ dev-dist/
├─ dist/
│ ├─ assets/
│ │ ├─ index-CS0zFWSm.js
│ │ └─ index-n4sTD7fc.css
│ ├─ icon-192.png
│ ├─ icon-512.png
│ ├─ index.html
│ ├─ logo.svg
│ └─ manifest.json
├─ e2e/
│ ├─ login.spec.ts
│ ├─ register.spec.ts
│ └─ setup-msw.ts
├─ netlify/
│ └─ functions/
│ ├─ keep-trpc-warm.ts
│ └─ trpc.ts
├─ playwright-report/
│ └─ index.html
├─ prisma/
│ ├─ migrations/
│ │ ├─ 20260221163231_init/
│ │ │ └─ migration.sql
│ │ └─ migration_lock.toml
│ └─ schema.prisma
├─ public/
│ ├─ icon-192.png
│ ├─ icon-512.png
│ ├─ logo.svg
│ └─ manifest.json
├─ server/
│ ├─ routers/
│ │ ├─ todo/
│ │ │ ├─ list.ts
│ │ │ └─ task.ts
│ │ ├─ auth-helpers.ts
│ │ ├─ login.ts
│ │ ├─ refreshToken.ts
│ │ ├─ register.ts
│ │ ├─ resetPassword.ts
│ │ ├─ user.ts
│ │ └─ verifyEmail.ts
│ ├─ context.ts
│ ├─ email.ts
│ ├─ trpc-base.ts
│ └─ trpc.ts
├─ src/
│ ├─ components/
│ │ ├─ lists/
│ │ │ ├─ ListActionsDropdown.tsx
│ │ │ ├─ ListItem.tsx
│ │ │ ├─ ListsHeader.tsx
│ │ │ ├─ SortableListItem.tsx
│ │ │ └─ SortableListsTable.tsx
│ │ ├─ tasks/
│ │ │ ├─ SortableTaskItem.tsx
│ │ │ ├─ TaskActionsDropdown.tsx
│ │ │ ├─ TaskItem.tsx
│ │ │ └─ TaskList.tsx
│ │ ├─ ui/
│ │ │ ├─ button.tsx
│ │ │ ├─ card.tsx
│ │ │ ├─ chart.tsx
│ │ │ ├─ checkbox.tsx
│ │ │ ├─ dialog.tsx
│ │ │ ├─ dropdown-menu.tsx
│ │ │ ├─ form.tsx
│ │ │ ├─ input.tsx
│ │ │ ├─ item.tsx
│ │ │ ├─ label.tsx
│ │ │ ├─ select.tsx
│ │ │ ├─ separator.tsx
│ │ │ ├─ sheet.tsx
│ │ │ ├─ skeleton.tsx
│ │ │ ├─ table.tsx
│ │ │ ├─ task-checkbox.tsx
│ │ │ └─ textarea.tsx
│ │ ├─ ActionBanner.tsx
│ │ ├─ ColorThemeSelector.tsx
│ │ ├─ EmptyLists.tsx
│ │ ├─ FabButton.tsx
│ │ ├─ GlobalIsFetchingIndicator.tsx
│ │ ├─ Logo.tsx
│ │ ├─ Navigation.tsx
│ │ ├─ PageContainer.tsx
│ │ ├─ PersistedQueryClientProvider.tsx
│ │ ├─ ProfileIcon.tsx
│ │ ├─ RealtimeListeners.tsx
│ │ ├─ SortableTaskList.tsx
│ │ ├─ ThemeProvider.tsx
│ │ └─ ThemeToggle.tsx
│ ├─ contexts/
│ │ └─ ThemeContext.ts
│ ├─ hooks/
│ │ ├─ useLists.ts
│ │ ├─ useListTasks.ts
│ │ ├─ useSupabaseRealtime.ts
│ │ └─ useSupabaseTaskRealtime.ts
│ ├─ lib/
│ │ ├─ queryPersister.ts
│ │ ├─ supabase.ts
│ │ ├─ theme-presets.ts
│ │ └─ utils.ts
│ ├─ routes/
│ │ ├─ \_authenticated/
│ │ │ ├─ lists/
│ │ │ │ ├─ $listId/
│ │ │ │ │ ├─ tasks/
│ │ │ │ │ │ ├─ $taskId/
│ │ │ │ │ │ │ ├─ delete.tsx
│ │ │ │ │ │ │ └─ edit.tsx
│ │ │ │ │ │ ├─ completed.tsx
│ │ │ │ │ │ └─ new.tsx
│ │ │ │ │ ├─ delete.tsx
│ │ │ │ │ └─ edit.tsx
│ │ │ │ ├─ $listId.tsx
│ │ │ │ ├─ index.tsx
│ │ │ │ └─ new.tsx
│ │ │ ├─ profile.tsx
│ │ │ └─ route.tsx
│ │ ├─ \_\_root.tsx
│ │ ├─ confirm-reset-password.tsx
│ │ ├─ index.tsx
│ │ ├─ login.tsx
│ │ ├─ register.tsx
│ │ ├─ reset-password.tsx
│ │ └─ verify-email.tsx
│ ├─ store/
│ │ ├─ authStore.ts
│ │ └─ bannerStore.ts
│ ├─ types/
│ │ ├─ database.types.ts
│ │ ├─ global.d.ts
│ │ ├─ task.ts
│ │ └─ trpc.ts
│ ├─ index.css
│ ├─ main.tsx
│ ├─ queryClient.ts
│ ├─ router.tsx
│ ├─ routeTree.gen.ts
│ ├─ trpc.ts
│ └─ vite-env.d.ts
├─ supabase/
│ └─ .temp/
│ ├─ cli-latest
│ ├─ gotrue-version
│ ├─ postgres-version
│ ├─ project-ref
│ ├─ storage-migration
│ └─ storage-version
├─ test-results/
│ └─ .last-run.json
├─ .env
├─ .gitignore
├─ components.json
├─ deno.lock
├─ eslint.config.js
├─ index.html
├─ netlify.toml
├─ package-lock.json
├─ package.json
├─ playwright.config.ts
├─ prisma.config.ts
├─ README.md
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.tscan this be organised better?

Searching the web

20 results

Yes, the current structure can be organized significantly better — especially for long-term maintainability, readability, and scaling.Your project mixes several concerns in a way that becomes confusing as the codebase grows:Client-side (Vite + React + TanStack) and server-side (tRPC + Prisma) are flattened together
Test folders are very deep and repetitive
Netlify functions are duplicated/oversplit
**mocks**, **tests**, e2e, playwright-report, test-results are scattered
src/routes is route-file-based (good), but deeply nested
server/ and netlify/functions duplication

Goals for a cleaner structure in 2025–2026Clear separation of client vs server
Feature-based or domain-based grouping (especially for lists + tasks)
Colocation of tests (next to the code they test)
Less nesting in routes & tests
Distinct places for infrastructure (prisma, netlify, supabase, mocks)
Monorepo-like feeling without actually splitting into real packages (yet)

Suggested improved structure (2026 best-practice flavor)

dotasks.app/
├─ prisma/ # unchanged – good isolation
│ ├─ schema.prisma
│ └─ migrations/
├─ supabase/ # config / temp files – keep or gitignore most
├─ netlify/ # only netlify-specific things
│ ├─ functions/
│ │ ├─ trpc.ts # ← main handler
│ │ └─ keep-trpc-warm.ts
│ └─ netlify.toml # ← moved here from root
├─ public/ # static assets – good
├─ src/ # ← pure **client** code from here
│ ├─ app/ # or routes/ — TanStack Router style
│ │ ├─ routes/ # ← flatter than current
│ │ │ ├─ login.tsx
│ │ │ ├─ register.tsx
│ │ │ ├─ verify-email.tsx
│ │ │ ├─ reset-password.tsx
│ │ │ ├─ confirm-reset-password.tsx
│ │ │ ├─ **root.tsx
│ │ │ └─ \_authenticated/ # protected layout + children
│ │ │ ├─ layout.tsx
│ │ │ ├─ profile.tsx
│ │ │ ├─ lists/
│ │ │ │ ├─ index.tsx # /lists
│ │ │ │ ├─ new.tsx
│ │ │ │ ├─ $listId.tsx
│ │ │ │ ├─ delete.tsx # or move to actions/
│ │ │ │ ├─ edit.tsx
│ │ │ │ └─ tasks/
│ │ │ │ ├─ new.tsx
│ │ │ │ ├─ completed.tsx
│ │ │ │ ├─ $taskId.tsx
│ │ │ │ ├─ edit.tsx
│ │ │ │ └─ delete.tsx
│ │ └─ components/ # global + shared UI (not domain specific)
│ │ ├─ ui/ # shadcn / primitive components
│ │ ├─ Logo.tsx
│ │ ├─ Navigation.tsx
│ │ ├─ ThemeToggle.tsx
│ │ ├─ FabButton.tsx
│ │ └─ ...
│ ├─ features/ # ← domain / feature slices (recommended!)
│ │ ├─ lists/
│ │ │ ├─ components/ # ListTable, SortableListItem, ListActionsDropdown…
│ │ │ ├─ hooks/ # useLists.ts
│ │ │ └─ types.ts
│ │ └─ tasks/
│ │ ├─ components/ # TaskItem, SortableTaskItem, TaskActionsDropdown…
│ │ ├─ hooks/ # useListTasks.ts
│ │ └─ types.ts
│ ├─ shared/
│ │ ├─ hooks/ # useSupabaseRealtime, useSupabaseTaskRealtime…
│ │ ├─ lib/ # supabase.ts, utils.ts, theme-presets.ts…
│ │ ├─ store/ # zustand / jotai stores
│ │ ├─ trpc/ # trpc client + react-query integration
│ │ └─ ui/ # if you want to keep shadcn separate
│ ├─ providers/
│ │ ├─ QueryClientProvider.tsx
│ │ ├─ ThemeProvider.tsx
│ │ └─ RealtimeListeners.tsx
│ ├─ main.tsx
│ └─ index.css
├─ server/ # ← all backend logic
│ ├─ routers/
│ │ ├─ auth/
│ │ │ ├─ login.ts
│ │ │ ├─ register.ts
│ │ │ ├─ verifyEmail.ts
│ │ │ ├─ resetPassword.ts
│ │ │ └─ refreshToken.ts
│ │ ├─ todo/
│ │ │ ├─ list.ts
│ │ │ └─ task.ts
│ │ └─ index.ts # or root router
│ ├─ context.ts
│ ├─ trpc.ts # createTRPCContext, initTRPC…
│ └─ email.ts
├─ tests/ # ← unified test location (or colocate!)
│ ├─ unit/
│ ├─ integration/
│ ├─ e2e/
│ │ ├─ login.spec.ts
│ │ └─ ...
│ └─ setup/
│ ├─ setupTests.ts
│ └─ trpc.test.ts
├─ mocks/ # renamed from **mocks\_\_
│ ├─ handlers/
│ ├─ mockData.ts
│ └─ trpc-msw.ts
├─ .github/workflows/
├─ .vscode/
├─ dist/ # build output – gitignored
├─ playwright-report/ # gitignored
├─ test-results/ # gitignored
├─ .env
├─ .gitignore
├─ components.json
├─ eslint.config.js
├─ package.json
├─ playwright.config.ts
├─ tsconfig\*.json
├─ vite.config.ts
└─ README.md

Quick improvement steps (without full refactor)Move all client-only folders under src/components/, routes/, hooks/, lib/, store/, contexts/, types/

Move server code into dedicated server/ folder (already almost there)
Flatten route nesting a bit (remove some $listId/tasks/$taskId levels if possible)
Colocate tests next to components / routes (most popular 2025–2026 pattern)ListTable.tsx → ListTable.test.tsx in same folder
Much easier to find + refactor

Merge Netlify function duplication — keep only one netlify/functions/trpc.ts
Consider grouping auth-related routes & procedures under auth/ subfolder
Move global UI (button.tsx, card.tsx, …) → src/components/ui/

Would you like the most minimal first step (e.g. 30-minute refactor), or do you prefer the full feature-slice style? Or are there any constraints (team preference, very large codebase already, etc.)?

20 web pages

Explain feature-slice architecture

Compare to Next.js App Router

Make structure diagram more concise

Think Harder
