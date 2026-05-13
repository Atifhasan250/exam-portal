'use client'

const resourceGroups = [
  {
    title: 'Free YouTube Learning',
    description: 'Curated playlists and tutorials for beginners who need structured guidance before paid coursework.',
    icon: 'fa-play-circle',
    items: ['Programming basics', 'Web development roadmaps', 'Problem-solving practice'],
  },
  {
    title: 'Exam Preparation',
    description: 'Practice-focused materials that support live tests, revision sessions, and concept review.',
    icon: 'fa-file-lines',
    items: ['Revision sheets', 'Short quizzes', 'Topic-based mock practice'],
  },
  {
    title: 'Future Premium Resources',
    description: 'This section is ready to grow into paid tutorials, premium notes, and member-only guidance as your community expands.',
    icon: 'fa-gem',
    items: ['Recorded tutorials', 'Structured study plans', 'Private support materials'],
  },
]

export default function ResourcesPageClient() {
  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col page-enter">
      <main className="flex-grow py-10 sm:py-16 px-4 mt-4 sm:mt-0">
        <div className="max-w-6xl mx-auto space-y-10">
          <section className="w-full bg-theme-surface border border-theme-border rounded-3xl p-8 sm:p-10 shadow-xl">
            <div className="w-20 h-20 bg-theme-accent/10 text-theme-accent rounded-full flex items-center justify-center mb-6">
              <i className="fas fa-layer-group text-3xl" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 text-theme-primary tracking-tight">Learning Resources</h1>
            <p className="text-theme-secondary text-lg leading-relaxed max-w-3xl">
              This hub is where your community can discover free learning content now and grow into a structured library of premium tutorials, notes, and guided study resources later.
            </p>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            {resourceGroups.map((group) => (
              <article key={group.title} className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-theme-accent/10 text-theme-accent flex items-center justify-center mb-4">
                  <i className={`fas ${group.icon}`} />
                </div>
                <h2 className="text-xl font-bold text-theme-primary mb-2">{group.title}</h2>
                <p className="text-theme-secondary leading-relaxed mb-4">{group.description}</p>
                <ul className="space-y-2 text-sm text-theme-secondary">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <i className="fas fa-check text-theme-accent mt-1 text-xs" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}
