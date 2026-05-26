import PageLoadingOverlay from './PageLoadingOverlay'

export default function PageSkeleton() {
  return (
    <PageLoadingOverlay>
      <div className="bg-theme-bg min-h-screen text-theme-primary pb-20">
        <div className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="skeleton h-9 w-9 rounded-xl" />
              <div className="skeleton h-5 w-44 rounded-lg" />
            </div>
            <div className="skeleton h-10 w-10 rounded-full" />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10 space-y-5">
          <div className="skeleton h-10 w-64 rounded-xl" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="bg-theme-surface border border-theme-border rounded-2xl p-5 space-y-3">
              <div className="skeleton h-6 w-2/3 rounded-lg" />
              <div className="skeleton h-4 w-1/2 rounded-lg" />
              <div className="skeleton h-4 w-1/3 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </PageLoadingOverlay>
  )
}
