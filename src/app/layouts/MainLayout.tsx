import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { footerNavItems, primaryNavItems, siteConfig } from '../config/site'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="site-root">
      <a className="skip-link visually-hidden" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Sirbon.dev home" onClick={closeMenu}>
            <span className="brand-mark" aria-hidden="true">{siteConfig.monogram}</span>
            <span>{siteConfig.brandName}</span>
          </Link>

          <nav className="site-nav" aria-label="Primary">
            <button
              type="button"
              className="menu-button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="primary-navigation-list"
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
              <span className="menu-button-label">Menu</span>
            </button>

            <ul id="primary-navigation-list" className={menuOpen ? 'nav-list open' : 'nav-list'}>
              {primaryNavItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} onClick={closeMenu}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li className="nav-list-cta">
                <NavLink className="nav-contact" to="/contact" onClick={closeMenu}>
                  Contact
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="site-shell">
        <main id="main-content" tabIndex={-1}>{children}</main>

        <footer className="site-footer">
          <div className="footer-brand">
            <strong>{siteConfig.ownerName}</strong>
            <span>{siteConfig.shortTagline}</span>
          </div>
          <nav aria-label="Footer" className="footer-links">
            {footerNavItems.map((item) => (
              <Link key={item.to} to={item.to}>{item.label}</Link>
            ))}
            <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
              GitHub <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </nav>
        </footer>
      </div>
    </div>
  )
}
