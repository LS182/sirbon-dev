export const siteConfig = {
  brandName: 'sirbon.dev',
  monogram: 'LS',
  ownerName: 'Liam Victor Sirbon',
  shortTagline: 'Software engineering student & full-stack developer · Cape Town, South Africa',
  githubUrl: 'https://github.com/LS182',
  githubHandle: 'github.com/LS182',
  location: 'Cape Town, Western Cape, South Africa',
} as const

export const primaryNavItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About', end: false },
  { to: '/experience', label: 'Experience', end: false },
  { to: '/skills', label: 'Skills', end: false },
  { to: '/services', label: 'Services', end: false },
  { to: '/projects', label: 'Projects', end: false },
  { to: '/reviews', label: 'Reviews', end: false },
] as const

export const footerNavItems = [
  { to: '/projects', label: 'Projects' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/contact', label: 'Contact' },
] as const
