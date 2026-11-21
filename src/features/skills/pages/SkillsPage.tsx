import { Code2, Database, Layers3, Server, Smartphone, Terminal } from 'lucide-react'
import { PageHeader } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { skillGroups, type SkillGroup } from '../data/skills'

function renderCategoryIcon(id: SkillGroup['id']) {
  switch (id) {
    case 'languages':
      return <Code2 size={20} aria-hidden="true" />
    case 'frontend':
      return <Layers3 size={20} aria-hidden="true" />
    case 'mobile':
      return <Smartphone size={20} aria-hidden="true" />
    case 'backend':
      return <Server size={20} aria-hidden="true" />
    case 'databases':
      return <Database size={20} aria-hidden="true" />
    case 'platforms':
      return <Terminal size={20} aria-hidden="true" />
  }
}

export function SkillsPage() {
  usePageTitle('Skills')

  return (
    <section className="page inner-page skills-page">
      <PageHeader
        eyebrow="SKILLS"
        title="Tools by purpose."
        intro="The following reflects Liam's technical experience across study and practical development work. It is grouped by use rather than represented as arbitrary percentages."
      />

      <div className="skill-category-grid">
        {skillGroups.map((group) => (
          <article key={group.id} className="skill-card">
            <div className="skill-card-icon">{renderCategoryIcon(group.id)}</div>
            <h2>{group.title}</h2>
            <ul>
              {group.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
