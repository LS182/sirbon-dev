export interface Env {
  DB?: D1Database
  ADMIN_ACCESS_TOKEN?: string
  GITHUB_APP_CLIENT_ID?: string
  GITHUB_APP_CLIENT_SECRET?: string
  GITHUB_APP_PRIVATE_KEY?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Cache-Control': 'no-store',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const url = new URL(context.request.url)
  const path = url.pathname.replace(/^\/api\/?/, '')

  if (path === 'health') {
    return json({
      ok: true,
      d1: Boolean(context.env.DB),
      githubAppConfigured: Boolean(context.env.GITHUB_APP_CLIENT_ID && context.env.GITHUB_APP_CLIENT_SECRET),
    })
  }

  if (path === 'github/status') {
    return json({
      configured: Boolean(context.env.GITHUB_APP_CLIENT_ID),
      publicMetadataOnly: true,
      privateRepositoriesExposed: false,
    })
  }

  if (path === 'auth/github') {
    if (!context.env.GITHUB_APP_CLIENT_ID) {
      return json({ error: 'GitHub App is not configured' }, 503)
    }
    const redirectUri = new URL(context.request.url)
    redirectUri.pathname = '/api/auth/github/callback'
    redirectUri.search = ''
    const authorize = new URL('https://github.com/login/oauth/authorize')
    authorize.searchParams.set('client_id', context.env.GITHUB_APP_CLIENT_ID)
    authorize.searchParams.set('redirect_uri', redirectUri.toString())
    authorize.searchParams.set('scope', 'read:user')
    return Response.redirect(authorize.toString(), 302)
  }

  if (path === 'auth/github/callback') {
    const code = url.searchParams.get('code')
    if (!code || !context.env.GITHUB_APP_CLIENT_ID || !context.env.GITHUB_APP_CLIENT_SECRET) {
      return json({ error: 'GitHub OAuth callback is not configured or incomplete' }, 400)
    }
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: context.env.GITHUB_APP_CLIENT_ID,
        client_secret: context.env.GITHUB_APP_CLIENT_SECRET,
        code,
      }),
    })
    const tokenResult = await tokenResponse.json() as { error?: string }
    if (tokenResult.error) return json({ error: 'GitHub authorization failed' }, 401)
    return Response.redirect('/admin', 302)
  }

  if (path === 'projects' && context.request.method === 'GET') {
    if (context.env.DB) {
      const result = await context.env.DB.prepare(
        'SELECT id, slug, name, summary, description, repository_url repositoryUrl, demo_url demoUrl, technologies, featured, published, updated_at updatedAt FROM projects WHERE published = 1 ORDER BY featured DESC, updated_at DESC',
      ).all()
      const projects = (result.results ?? []).map((row) => ({
        ...row,
        technologies: JSON.parse(String(row.technologies || '[]')),
        featured: Boolean(row.featured),
        published: Boolean(row.published),
      }))
      return json({ projects })
    }
    return json({ projects: [] })
  }

  if (path === 'admin/status') {
    const expected = context.env.ADMIN_ACCESS_TOKEN
    const authorization = context.request.headers.get('Authorization') ?? ''
    const authenticated = Boolean(expected && authorization === `Bearer ${expected}`)
    return json({ authenticated, configured: Boolean(expected) })
  }

  if (path.startsWith('admin/projects')) {
    const expected = context.env.ADMIN_ACCESS_TOKEN
    const authorization = context.request.headers.get('Authorization') ?? ''
    if (!expected || authorization !== `Bearer ${expected}`) {
      return json({ error: 'Unauthorized' }, 401)
    }
    if (!context.env.DB) return json({ error: 'D1 database is not configured' }, 503)

    const slug = path.slice('admin/projects/'.length)
    if (context.request.method === 'DELETE' && slug) {
      await context.env.DB.prepare('DELETE FROM projects WHERE slug = ?').bind(slug).run()
      return json({ deleted: true })
    }
    if (context.request.method === 'POST' && path === 'admin/projects') {
      const body = await context.request.json() as Record<string, unknown>
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const projectSlug = typeof body.slug === 'string' ? body.slug.trim() : ''
      if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(projectSlug)) {
        return json({ error: 'Valid name and slug are required' }, 400)
      }
      const technologies = Array.isArray(body.technologies) ? body.technologies.filter((item) => typeof item === 'string') : []
      await context.env.DB.prepare(
        'INSERT INTO projects (id, slug, name, summary, description, repository_url, demo_url, technologies, featured, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        crypto.randomUUID(),
        projectSlug,
        name,
        typeof body.summary === 'string' ? body.summary : '',
        typeof body.description === 'string' ? body.description : null,
        typeof body.repositoryUrl === 'string' ? body.repositoryUrl : null,
        typeof body.demoUrl === 'string' ? body.demoUrl : null,
        JSON.stringify(technologies),
        body.featured === true ? 1 : 0,
        body.published !== false ? 1 : 0,
      ).run()
      return json({ created: true, slug: projectSlug }, 201)
    }
  }

  return json({ error: 'Not found' }, 404)
}
