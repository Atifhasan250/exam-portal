import PageLoadingOverlay from '@/components/PageLoadingOverlay'

export default function AdminDashboardLoading() {
  return (
    <PageLoadingOverlay>
      <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="skeleton h-9 w-56 rounded-xl" />
            <div className="skeleton h-10 w-32 rounded-xl" />
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {[0, 1, 2].map((stat) => (
              <div
                key={stat}
                className="bg-theme-surface border border-theme-border rounded-2xl p-5 space-y-3"
              >
                <div className="skeleton h-4 w-24 rounded-lg" />
                <div className="skeleton h-8 w-16 rounded-lg" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {[0, 1, 2, 3].map((card) => (
              <div
                key={card}
                className="bg-theme-surface border border-theme-border rounded-2xl p-5 flex items-center justify-between"
              >
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-5 w-2/3 rounded-lg" />
                  <div className="skeleton h-4 w-1/3 rounded-lg" />
                </div>
                <div className="flex space-x-2">
                  <div className="skeleton h-9 w-20 rounded-xl" />
                  <div className="skeleton h-9 w-20 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLoadingOverlay>
  )
}
