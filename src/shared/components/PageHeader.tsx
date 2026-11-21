interface PageHeaderProps {
  eyebrow: string
  title: string
  intro?: string
  aside?: React.ReactNode
}

export function PageHeader({ eyebrow, title, intro, aside }: PageHeaderProps) {
  if (aside) {
    return (
      <header className="page-header page-header-split">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {intro && <p className="page-intro">{intro}</p>}
        </div>
        {aside}
      </header>
    )
  }

  return (
    <header className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {intro && <p className="page-intro">{intro}</p>}
    </header>
  )
}
