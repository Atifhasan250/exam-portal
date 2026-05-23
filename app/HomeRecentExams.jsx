import Link from 'next/link'
import { getCachedHomeRecentExams } from '@/lib/publicCache'

export default async function HomeRecentExams() {
  let exams

  try {
    exams = await getCachedHomeRecentExams()
  } catch {
    return null
  }

  if (!exams.length) return null

  return (
    <section className="bg-theme-bg text-theme-primary px-4 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-theme-primary">Recent Exams</h2>
            <p className="text-sm text-theme-secondary mt-1">
              Public exam pages for practice, revision, and leaderboard discovery.
            </p>
          </div>
          <Link href="/exams" className="hidden sm:inline-flex text-sm font-bold text-theme-accent hover:underline">
            View all exams
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Link
              key={exam._id}
              href={`/exam/${exam._id}`}
              className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm hover:border-theme-accent/50 hover:-translate-y-0.5 transition-all"
            >
              <h3 className="font-bold text-theme-primary leading-snug mb-3">{exam.title}</h3>
              <div className="flex items-center justify-between text-sm text-theme-secondary">
                <span><i className="fas fa-clock mr-1.5" />{exam.duration} min</span>
                <span className="font-semibold text-theme-accent">Open</span>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/exams" className="sm:hidden inline-flex mt-5 text-sm font-bold text-theme-accent hover:underline">
          View all exams
        </Link>
      </div>
    </section>
  )
}
