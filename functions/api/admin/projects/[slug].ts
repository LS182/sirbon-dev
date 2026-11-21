import { projectUpdateSchema } from '../../../../shared/schemas'
import { requireSession } from '../../../_lib/auth/session'
import type { Env } from '../../../_lib/config/env'
import { findProjectMetaBySlug, updateAdminProject } from '../../../_lib/database/projects'
import { json, methodNotAllowed } from '../../../_lib/http/response'

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'PUT') {
    return methodNotAllowed(['PUT'])
  }
  const auth = await requireSession(context)
  if (!auth.session) return auth.response!
  if (!context.env.DB) return json({ error: 'Database unavailable' }, 503)

  const slug = String(context.params.slug || '').trim()
  if (!slug) return json({ error: 'Project not found' }, 404)

  const body = await context.request.json().catch(() => null)
  const parsed = projectUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: 'Invalid project update', issues: parsed.error.issues }, 400)
  }

  const existing = await findProjectMetaBySlug(context.env.DB, slug)
  if (!existing) return json({ error: 'Project not found' }, 404)

  if (existing.is_private && parsed.data.published) {
    const hasPublicFields = Boolean(
      parsed.data.publicName?.trim()
      && parsed.data.publicSummary?.trim()
      && parsed.data.publicDescription?.trim(),
    )
    if (!hasPublicFields) {
      return json({
        error: 'Private repositories require an explicitly authored public name, public summary, and public description before publishing.',
      }, 400)
    }
  }

  await updateAdminProject(context.env.DB, slug, parsed.data)
  return json({ updated: true })
}
