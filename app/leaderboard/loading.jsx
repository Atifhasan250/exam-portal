export default function LeaderboardLoading() {
  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center space-x-3">
          <div className="skeleton h-10 w-10 rounded-full" />
          <div className="skeleton h-9 w-52 rounded-xl" />
        </div>

        {[0, 1].map((section) => (
          <div key={section} className="space-y-4">
            <div className="skeleton h-7 w-64 rounded-lg" />
            <div className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden">
              {[0, 1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="flex items-center px-5 py-4 border-b border-theme-border last:border-b-0"
                >
                  <div className="skeleton h-8 w-8 rounded-full mr-4" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-40 rounded-lg" />
                    <div className="skeleton h-3 w-24 rounded-lg" />
                  </div>
                  <div className="skeleton h-6 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
