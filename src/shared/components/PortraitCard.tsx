import { ArrowUpRight, GraduationCap, MapPin, Terminal } from 'lucide-react'
import { siteConfig } from '../../app/config/site'

export function PortraitCard({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={compact ? 'profile-panel profile-panel-compact' : 'profile-panel'}
      aria-label="Liam Victor Sirbon — developer summary"
    >
      <div className="profile-panel-head">
        <span className="profile-panel-mark" aria-hidden="true">{siteConfig.monogram}</span>
        <div>
          <p className="profile-panel-name">{siteConfig.ownerName}</p>
          <span className="profile-panel-sub">Software Engineering Student</span>
        </div>
      </div>

      <dl className="profile-specs">
        <div>
          <dt><MapPin size={14} aria-hidden="true" /> Location</dt>
          <dd>Cape Town, South Africa</dd>
        </div>
        <div>
          <dt><GraduationCap size={14} aria-hidden="true" /> Education</dt>
          <dd>CPUT · Diploma in IT Applications Development (2025–2027)</dd>
        </div>
        <div>
          <dt><Terminal size={14} aria-hidden="true" /> GitHub</dt>
          <dd>
            <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
              {siteConfig.githubHandle} <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </dd>
        </div>
      </dl>
    </aside>
  )
}
