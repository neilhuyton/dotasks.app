import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard')({
  // Optional: loader if you want to fetch dashboard data
  // loader: async ({ context }) => {
  //   return context.trpc.dashboard.getStats.query()
  // },

  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Example widgets */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Active Tasks</h3>
          <p className="text-3xl font-bold">42</p>
        </div>
        
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Completed Today</h3>
          <p className="text-3xl font-bold">8</p>
        </div>
        
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Lists</h3>
          <p className="text-3xl font-bold">7</p>
        </div>
      </div>

      {/* Recent activity, charts, quick actions, etc. */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-medium">Recent Activity</h3>
        <p className="text-muted-foreground">No recent activity yet.</p>
      </div>
    </div>
  )
}