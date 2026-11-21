import { PageHeader } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { education, experience } from '../data/experience'

export function ExperiencePage() {
  usePageTitle('Experience & Education')

  return (
    <section className="page inner-page">
      <PageHeader
        eyebrow="EXPERIENCE & EDUCATION"
        title="A practical course of study."
        intro="My academic foundation at Cape Peninsula University of Technology paired with student leadership and collaborative software development roles."
      />

      <div className="timeline-layout">
        <div>
          <h2 className="column-heading">Education</h2>
          <div className="timeline">
            {education.map((item) => (
              <article key={item.title}>
                <time>{item.period}</time>
                <div>
                  <h3>{item.title}</h3>
                  <p className="timeline-place">{item.institution}</p>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div>
          <h2 className="column-heading">Leadership and collaboration</h2>
          <div className="timeline">
            {experience.map((item) => (
              <article key={item.title}>
                <time>{item.period}</time>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
