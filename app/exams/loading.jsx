export default function ExamsLoading() {
  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-14">
        <div className="flex items-center space-x-3">
          <div className="skeleton h-10 w-10 rounded-full" />
          <div className="skeleton h-9 w-40 rounded-xl" />
        </div>

        {[0, 1].map((section) => (
          <div key={section} className="space-y-5">
            <div className="flex items-center space-x-3">
              <div className="skeleton h-5 w-5 rounded-full" />
              <div className="skeleton h-8 w-48 rounded-xl" />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="bg-theme-surface border border-theme-border rounded-2xl p-6 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="skeleton h-6 w-3/4 rounded-lg" />
                    <div className="skeleton h-6 w-16 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-1/2 rounded-lg" />
                    <div className="skeleton h-4 w-2/3 rounded-lg" />
                  </div>
                  <div className="skeleton h-11 w-full rounded-xl mt-2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
