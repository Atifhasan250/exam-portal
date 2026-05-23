import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import Resource from '@/lib/models/Resource'
import ResourceProgress from '@/lib/models/ResourceProgress'
import ResourceVideoPlayer from '@/components/resources/ResourceVideoPlayer'
import { buildPageMetadata } from '@/lib/site'
import { isObjectId, serialize } from '@/lib/resourceUtils'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const resource = await getResourceBySlug(slug)

  if (!resource) {
    return buildPageMetadata({
      title: 'Resource Not Found',
      description: 'This learning resource could not be found.',
      path: `/resources/watch/${slug}`,
    })
  }

  return buildPageMetadata({
    title: resource.title,
    description: `Watch ${resource.title} on IT Resource Zone.`,
    path: `/resources/watch/${slug}`,
    keywords: ['IT learning video', resource.categoryId?.name, resource.channelTitle].filter(Boolean),
  })
}

export default async function ResourceWatchPage({ params }) {
  const { slug } = await params
  const resource = await getResourceBySlug(slug)
  if (!resource || resource.type !== 'youtube') notFound()

  const { userId } = await auth()
  const progress = userId
    ? await ResourceProgress.findOne({ clerkUserId: userId, resourceId: resource._id }).lean()
    : null

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary page-enter">
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 pb-28 space-y-6">
        <Link href={resource.categoryId?.slug ? `/resources/${resource.categoryId.slug}` : '/resources'} className="inline-flex items-center gap-2 text-sm font-bold text-theme-secondary hover:text-theme-primary">
          <i className="fas fa-arrow-left" />
          {resource.categoryId?.name || 'Resources'}
        </Link>

        <section className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <div className="space-y-5 min-w-0">
            <ResourceVideoPlayer resource={serialize(resource)} initialProgress={serialize(progress)} />
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-theme-accent">Video</p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 leading-tight">{resource.title}</h1>
                  <p className="text-theme-secondary mt-2">{resource.channelTitle || 'YouTube'}</p>
                </div>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 rounded-xl bg-theme-accent text-white font-bold text-sm text-center shrink-0"
                >
                  <i className="fab fa-youtube mr-2" />
                  Watch on YouTube
                </a>
              </div>
            </div>
          </div>

          <aside className="bg-theme-surface border border-theme-border rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-extrabold">Details</h2>
            <Detail label="Level" value={levelLabel(resource.level)} />
            <Detail label="Language" value={languageLabel(resource.language)} />
            <Detail label="Duration" value={formatDuration(resource.durationSeconds)} />
            <Detail label="Category" value={resource.categoryId?.name || 'Resources'} />
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wide text-theme-secondary mb-2">Video Link</p>
              <a href={resource.url} target="_blank" rel="noreferrer" className="text-sm text-theme-accent break-all hover:underline">
                {resource.url}
              </a>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

async function getResourceBySlug(slug) {
  await connectDB()
  const idCandidate = slug.split('-').at(-1)
  const query = {
    published: true,
    type: 'youtube',
    $or: [
      { slug },
      ...(isObjectId(idCandidate) ? [{ _id: idCandidate }] : []),
    ],
  }

  return Resource.findOne(query)
    .populate('categoryId', 'name slug icon color')
    .lean()
}

function Detail({ label, value }) {
  if (!value) return null

  return (
    <div className="flex items-center justify-between gap-4 border-t border-theme-border pt-3">
      <span className="text-sm text-theme-secondary">{label}</span>
      <span className="text-sm font-bold text-theme-primary text-right">{value}</span>
    </div>
  )
}

function levelLabel(level) {
  if (level === 'intermediate') return 'Intermediate'
  if (level === 'advanced') return 'Advanced'
  return 'Beginner'
}

function languageLabel(language) {
  if (language === 'bn') return 'Bangla'
  if (language === 'en') return 'English'
  if (language === 'mixed') return 'Mixed'
  return 'Other'
}

function formatDuration(seconds = 0) {
  const total = Number(seconds) || 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours) return `${hours}h ${minutes}m`
  return minutes ? `${minutes}m` : ''
}
