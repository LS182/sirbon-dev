interface CaseStudySectionProps {
  number: string
  title: string
  copy?: string
  items?: string[]
}

export function CaseStudySection({ number, title, copy, items }: CaseStudySectionProps) {
  return (
    <section className="case-section">
      <div className="case-number">{number}</div>
      <div>
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
        {items && (
          <ul>
            {items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
      </div>
    </section>
  )
}
