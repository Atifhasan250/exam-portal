import { connectDB } from '@/lib/db'
import AdminAuditLog from '@/lib/models/AdminAuditLog'
import { logger } from '@/lib/logger'

/**
 * Log an admin action to the database (fire-and-forget).
 *
 * @param {Request} request  — incoming request (for IP extraction)
 * @param {object}  admin    — decoded admin JWT payload ({ username })
 * @param {string}  action   — e.g. "CREATE_EXAM", "DELETE_EXAM"
 * @param {string}  [targetId] — the ObjectId of the affected resource
 * @param {object}  [details]  — any extra metadata
 */
export function logAdminAction(request, admin, action, targetId, details) {
  const forwardedFor = request?.headers?.get?.('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown'

  // Fire-and-forget: don't await, don't block the response
  connectDB()
    .then(() =>
      AdminAuditLog.create({
        admin: admin?.username || 'unknown',
        action,
        targetId: targetId || undefined,
        details: details || undefined,
        ip,
      }),
    )
    .then(() => logger.info(`[Audit] ${action} by ${admin?.username}`, { targetId }))
    .catch((error) => logger.error('[Audit] Failed to log admin action', { action, error: error.message }))
}
