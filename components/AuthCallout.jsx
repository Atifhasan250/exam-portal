import Link from 'next/link'

export default function AuthCallout({ title, description, href = '/sign-in', action = 'Sign In' }) {
  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 shadow-sm text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent mx-auto mb-4">
        <i className="fas fa-user-lock text-2xl" />
      </div>
      <h2 className="text-2xl font-extrabold text-theme-primary mb-2">{title}</h2>
      <p className="text-theme-secondary mb-6">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-theme-accent text-theme-accent-text font-bold hover:opacity-90 transition-all"
      >
        {action}
      </Link>
    </div>
  )
}
