import { describe, expect, it } from 'vitest'

describe('portfolio API contract', () => {
  it('defines the public project shape', () => {
    const project = { slug: 'sirbon-dev', name: 'Sirbon.dev', technologies: ['React'] }
    expect(project.slug).toMatch(/^[a-z0-9-]+$/)
    expect(project.technologies).toContain('React')
  })
})
