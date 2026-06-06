export default function ResourcePageControls({ loading, hasNext, hasPrevious, onNext, onPrevious }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {hasNext ? (
        <button
          onClick={onNext}
          disabled={loading}
          className="px-5 py-3 rounded-xl bg-theme-surface border border-theme-border text-sm font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Load Next Resources'}
        </button>
      ) : null}
      {hasPrevious ? (
        <button
          onClick={onPrevious}
          disabled={loading}
          className="px-5 py-3 rounded-xl bg-theme-surface border border-theme-border text-sm font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Load Prev Resources'}
        </button>
      ) : null}
    </div>
  )
}
