import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { publicResourceSlug } from '@/lib/resourceUtils'
import { getCachedCategorySiblingResources, getCachedResourcePageBySlug } from '@/lib/publicCache'
import PdfPreviewFrame from '@/components/resources/PdfPreviewFrame'
import ResourceOpenButton from '@/components/resources/ResourceOpenButton'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const resource = await getResourceBySlug(slug)

  if (!resource) {
    return {
      ...buildPageMetadata({
        title: 'Resource Not Found',
        description: 'This learning resource could not be found.',
        path: `/resources/view/${slug}`,
      }),
      robots: { index: false, follow: true },
    }
  }

  const description = resource.description?.trim()
    || `Open ${resource.title} on IT Resource Zone.`

  return buildPageMetadata({
    title: resource.title,
    description,
    path: `/resources/view/${publicResourceSlug(resource)}`,
    keywords: ['IT learning resource', resource.categoryId?.name, labelForType(resource.type)].filter(Boolean),
    image: resource.thumbnailUrl || '/link-preview.jpg',
    imageAlt: resource.title,
  })
}

export default async function ResourceViewPage({ params }) {
  const { slug } = await params
  const resource = await getResourceBySlug(slug)
  if (!resource || resource.type === 'youtube') notFound()

  const { previousResource, nextResource } = await getCachedCategorySiblingResources(resource)
  const resourceUrl = resource.url || resource.imagekitUrl
  const resourceSchema = buildResourceSchema(resource)
  const breadcrumbSchema = buildBreadcrumbSchema(resource)

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary page-enter">
      {[resourceSchema, breadcrumbSchema].filter(Boolean).map((schema) => (
        <script
          key={schema['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 pb-28 space-y-6">
        <div className="flex items-center space-x-3">
          <Link
            href={resource.categoryId?.slug ? `/resources/${resource.categoryId.slug}` : '/resources'}
            aria-label={`Back to ${resource.categoryId?.name || 'resources'}`}
            className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shrink-0"
          >
            <i className="fas fa-arrow-left" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold text-theme-primary">{resource.categoryId?.name || 'Resources'}</h1>
        </div>

        <section className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <div className="space-y-5 min-w-0">
            <ResourcePreview resource={resource} resourceUrl={resourceUrl} />
            <ResourceNavigation previousResource={previousResource} nextResource={nextResource} />
          </div>

          <aside className="bg-theme-surface border border-theme-border rounded-2xl p-5 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide text-theme-accent">{labelForType(resource.type)}</p>
              <h2 className="text-lg font-extrabold leading-snug">{resource.title}</h2>
              {resource.categoryId?.name ? <p className="text-sm text-theme-secondary">{resource.categoryId.name}</p> : null}
            </div>
            <Detail label="Level" value={levelLabel(resource.level)} />
            <Detail label="Language" value={languageLabel(resource.language)} />
            <Detail label="Type" value={labelForType(resource.type)} />
            <Detail label="Category" value={resource.categoryId?.name || 'Resources'} />
            {resource.description ? (
              <p className="border-t border-theme-border pt-3 text-sm leading-relaxed text-theme-secondary whitespace-pre-line">{resource.description}</p>
            ) : null}
            {resourceUrl ? (
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wide text-theme-secondary mb-2">Resource Link</p>
                <a href={resourceUrl} target="_blank" rel="noreferrer" className="text-sm text-theme-accent break-all hover:underline">
                  {resourceUrl}
                </a>
              </div>
            ) : null}
          </aside>
        </section>
      </main>
    </div>
  )
}

const getResourceBySlug = getCachedResourcePageBySlug

function ResourcePreview({ resource, resourceUrl }) {
  const isPdf = resource.type === 'pdf' && resourceUrl
  const isImage = resource.type === 'image' && (resource.imagekitUrl || resource.thumbnailUrl || resourceUrl)
  const downloadUrl = getDownloadUrl(resource, resourceUrl)
  const showDownloadButton = Boolean(downloadUrl && ['pdf', 'image'].includes(resource.type))

  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden shadow-xl">
      {isPdf ? (
        <PdfPreviewFrame title={resource.title} src={resourceUrl} thumbnailUrl={resource.thumbnailUrl} />
      ) : isImage ? (
        <div className="relative aspect-[4/3] sm:aspect-video bg-theme-bg">
          <img src={resource.imagekitUrl || resource.thumbnailUrl || resourceUrl} alt={resource.title} className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="min-h-[320px] bg-theme-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-center text-theme-accent">
            <i className={`fas ${iconForType(resource.type)} text-2xl`} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">{resource.title}</h2>
            <p className="mt-1 text-sm text-theme-secondary">{resource.fileName || resourceUrl || 'External learning resource'}</p>
          </div>
        </div>
      )}
      <div className="border-t border-theme-border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-theme-accent">{labelForType(resource.type)}</p>
          <p className="text-sm text-theme-secondary">Opening this resource marks it complete.</p>
        </div>
        {resourceUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {showDownloadButton ? (
              <ResourceOpenButton
                resourceId={resource._id?.toString()}
                href={downloadUrl}
                label={downloadLabel(resource.type)}
                pendingLabel="Downloading..."
                icon="fa-download"
                variant="secondary"
                download={resource.fileName || true}
                newTab={false}
              />
            ) : null}
            <ResourceOpenButton resourceId={resource._id?.toString()} href={resourceUrl} label={openLabel(resource.type)} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ResourceNavigation({ previousResource, nextResource }) {
  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex justify-start">
          <ResourceNavButton resource={previousResource} direction="previous" />
        </div>
        <div className="flex justify-end">
          <ResourceNavButton resource={nextResource} direction="next" />
        </div>
      </div>
    </div>
  )
}

function ResourceNavButton({ resource, direction }) {
  const isPrevious = direction === 'previous'
  const label = isPrevious ? 'Previous' : 'Next'
  const icon = isPrevious ? 'fa-arrow-left' : 'fa-arrow-right'
  const content = (
    <>
      {isPrevious ? <i className={`fas ${icon} text-xs shrink-0`} /> : null}
      <span>{label}</span>
      {!isPrevious ? <i className={`fas ${icon} text-xs shrink-0`} /> : null}
    </>
  )

  if (!resource?.href) {
    return (
      <button
        type="button"
        aria-label={label}
        disabled
        className="h-11 w-full sm:w-32 rounded-xl bg-transparent border border-transparent text-theme-secondary text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed opacity-30"
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      href={resource.href}
      title={resource.title}
      aria-label={label}
      className="h-11 w-full sm:w-32 rounded-xl border border-theme-accent bg-theme-accent text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-theme-accent/30 hover:brightness-110"
    >
      {content}
    </Link>
  )
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

function iconForType(type) {
  if (type === 'pdf') return 'fa-file-pdf'
  if (type === 'link') return 'fa-link'
  if (type === 'image') return 'fa-image'
  return 'fa-file'
}

function labelForType(type) {
  if (type === 'pdf') return 'PDF'
  if (type === 'link') return 'Link'
  if (type === 'image') return 'Image'
  return 'File'
}

function openLabel(type) {
  if (type === 'pdf') return 'Open PDF'
  if (type === 'link') return 'Open link'
  if (type === 'image') return 'Open image'
  return 'Open file'
}

function downloadLabel(type) {
  if (type === 'image') return 'Download image'
  return 'Download PDF'
}

function getDownloadUrl(resource, resourceUrl) {
  if (!resourceUrl || !['pdf', 'image'].includes(resource.type)) return ''

  try {
    const url = new URL(resourceUrl)
    if (/(^|\.)imagekit\.io$/i.test(url.hostname)) {
      url.searchParams.set('ik-attachment', 'true')
      return url.toString()
    }
  } catch {
    return resourceUrl
  }

  return resourceUrl
}

function levelLabel(level) {
  if (level === 'intermediate') return 'Intermediate'
  if (level === 'advanced') return 'Advanced'
  return 'Beginner'
}

function languageLabel(language) {
  if (language === 'bn') return 'Bangla'
  if (language === 'en') return 'English'
  if (language === 'hi') return 'Hindi'
  if (language === 'mixed') return 'Mixed'
  return 'Other'
}

function buildResourceSchema(resource) {
  const siteUrl = getSiteUrl()
  const viewUrl = new URL(`/resources/view/${publicResourceSlug(resource)}`, siteUrl).toString()

  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: resource.title,
    description: resource.description || `Open ${resource.title} on IT Resource Zone.`,
    url: viewUrl,
    inLanguage: schemaLanguage(resource.language),
    learningResourceType: labelForType(resource.type),
    isAccessibleForFree: true,
    provider: {
      '@type': 'Organization',
      name: 'IT Resource Zone',
    },
  }
}

function buildBreadcrumbSchema(resource) {
  const siteUrl = getSiteUrl()
  const categorySlug = resource.categoryId?.slug
  const categoryName = resource.categoryId?.name || 'Resources'

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Resources',
        item: new URL('/resources', siteUrl).toString(),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: new URL(categorySlug ? `/resources/${categorySlug}` : '/resources', siteUrl).toString(),
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: resource.title,
        item: new URL(`/resources/view/${publicResourceSlug(resource)}`, siteUrl).toString(),
      },
    ],
  }
}

function schemaLanguage(language) {
  if (language === 'bn') return 'bn'
  if (language === 'en') return 'en'
  if (language === 'hi') return 'hi'
  return undefined
}
