export function PortraitCard({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={compact ? 'portrait-card portrait-card-compact' : 'portrait-card'}
      aria-label="Liam Victor Sirbon — Cape Town software engineering profile card"
    >
      <div className="portrait-header-rule" aria-hidden="true">
        <span>SIRBON.DEV</span>
        <span>ZA / CPT</span>
      </div>
      <div className="portrait-monogram" aria-hidden="true">LS</div>
      <div className="portrait-meta">
        <p className="portrait-name">Liam Victor Sirbon</p>
        <span className="portrait-role">Dip. IT Applications Development (CPUT)</span>
        <span className="portrait-coords">Cape Town · South Africa</span>
      </div>
    </aside>
  )
}
