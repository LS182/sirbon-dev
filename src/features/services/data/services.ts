export interface ServiceCapability {
  number: string
  title: string
  summary: string
  details: string[]
}

export const serviceCapabilities: ServiceCapability[] = [
  {
    number: '01',
    title: 'Full-stack web applications',
    summary: 'Practical browser interfaces paired with structured backend APIs and relational data models.',
    details: [
      'React & TypeScript interfaces',
      'REST API design & integration',
      'Authentication, validation & state flows',
    ],
  },
  {
    number: '02',
    title: 'Database design & modelling',
    summary: 'Relational schema design focused on data integrity, normalization and clear domain boundaries.',
    details: [
      '3NF normalization & schema refactoring',
      "Crow's Foot ERD documentation",
      'MySQL & SQLite / D1 query design',
    ],
  },
  {
    number: '03',
    title: 'Backend & application systems',
    summary: 'Maintainable server-side logic and deployment setups built for academic, internal or small-team projects.',
    details: [
      'Java / Spring Boot & PHP REST services',
      'Python scripting & automation',
      'Linux, Docker & Cloudflare Pages deployment',
    ],
  },
]
