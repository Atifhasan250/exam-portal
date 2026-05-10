'use client'


export default function ResourcesPage() {
  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col page-enter">
      <main className="flex-grow flex items-center justify-center py-10 sm:py-16 px-4 mt-4 sm:mt-0">
        <div className="w-full max-w-lg bg-theme-surface border border-theme-border rounded-3xl p-10 text-center shadow-xl transition-all duration-300 hover:shadow-2xl mb-24 sm:mb-32">
          <div className="w-20 h-20 mx-auto bg-theme-accent/10 text-theme-accent rounded-full flex items-center justify-center mb-6">
            <i className="fas fa-tools text-3xl" />
          </div>
          <h2 className="text-3xl font-extrabold mb-4 text-theme-primary tracking-tight">Coming Soon</h2>
          <p className="text-theme-secondary text-lg leading-relaxed">
            We are hard at work building this feature. Check back later for some awesome resources!
          </p>
        </div>
      </main>
    </div>
  )
}
