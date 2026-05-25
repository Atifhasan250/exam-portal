import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="bg-theme-bg min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center bg-theme-surface border border-theme-border rounded-2xl p-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-theme-bg border border-theme-border flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-compass text-theme-accent text-2xl" />
        </div>
        <h1 className="text-3xl font-extrabold text-theme-primary mb-2">Page not found</h1>
        <p className="text-theme-secondary mb-6">The page you were looking for does not exist or has been moved.</p>
        <Link href="/" className="inline-flex items-center px-6 py-3 rounded-xl bg-theme-accent text-theme-accent-text font-bold hover:opacity-90 transition-all">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
