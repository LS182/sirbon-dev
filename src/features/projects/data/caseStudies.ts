import type { CaseStudy } from '../types/project'

export const caseStudies: CaseStudy[] = [
  {
    slug: 'studentrent',
    name: 'StudentRent',
    kind: 'University group project',
    summary: 'A student accommodation platform for discovering listings and supporting landlord functionality.',
    purpose:
      'The project explores how a student accommodation platform can organise property listings and the interactions between students and landlords.',
    problem:
      'Accommodation information needs clear structure, practical search and listing workflows, and a backend that keeps the interface and database consistent.',
    technologies: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'PHP REST API', 'MySQL', 'InfinityFree'],
    architecture: [
      'React and TypeScript provide the browser interface.',
      'PHP REST endpoints provide application data and operations.',
      'MySQL stores accommodation and application data.',
      'InfinityFree hosts the deployed application components.',
    ],
    contribution: [
      'Worked as a group leader and helped coordinate the project.',
      'Contributed to deployment architecture and practical infrastructure decisions.',
      'Worked on database migration and full-stack data flow.',
      'Helped connect frontend requirements with API and database implementation.',
    ],
    challenges: [
      'Keeping React, API contracts and MySQL data structures aligned across a group implementation.',
      'Moving database work and application infrastructure into a deployed environment rather than only a local setup.',
      'Separating landlord and student-facing workflows without hiding the underlying system complexity.',
    ],
    featured: true,
  },
  {
    slug: 'tee2pin-dinner-club',
    name: 'Tee2Pin Dinner Club',
    kind: 'Database design assignment',
    summary: 'A relational database design assignment distinguishing a dinner profile from a scheduled invitation.',
    purpose:
      'The assignment models a dinner club and shows how recurring profile information differs from individual scheduled invitations.',
    problem:
      'A dinner profile should not be confused with a particular scheduled event. The design needed to represent both without duplicating data or losing relationships.',
    technologies: ['draw.io', "Crow's Foot ERD", 'Relational database design', '3NF'],
    architecture: [
      'Project terminology is defined before entities and relationships are drawn.',
      'Core concepts are separated into normalized 3NF tables.',
      "A Crow's Foot ERD represents cardinality and participation.",
      'Scheduled invitations link individuals and occasions to the correct dinner context.',
    ],
    contribution: [
      'Defined project terminology for the dinner club model.',
      "Designed the Crow's Foot ERD in draw.io.",
      'Worked from normalized 3NF tables.',
      'Distinguished a standard dinner profile from an individual scheduled invitation.',
    ],
    challenges: [
      'Avoiding repeated data by identifying the stable dinner profile separately from scheduled occurrences.',
      'Choosing relationships that accurately reflect which entities are required and which can vary.',
      'Using terminology consistently throughout the ERD and supporting tables.',
    ],
    featured: true,
  },
]
