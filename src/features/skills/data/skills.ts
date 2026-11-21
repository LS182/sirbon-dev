export interface SkillGroup {
  id: 'languages' | 'frontend' | 'mobile' | 'backend' | 'databases' | 'platforms'
  title: string
  items: string[]
}

export const skillGroups: SkillGroup[] = [
  { id: 'languages', title: 'Programming languages', items: ['Python', 'Java', 'JavaScript', 'C++', 'Dart'] },
  { id: 'frontend', title: 'Frontend development', items: ['React', 'TypeScript', 'Vite', 'Tailwind CSS'] },
  { id: 'mobile', title: 'Mobile development', items: ['Flutter', 'Dart'] },
  { id: 'backend', title: 'Backend development', items: ['Spring Boot', 'PHP REST APIs', 'REST design'] },
  { id: 'databases', title: 'Databases', items: ['MySQL', 'Database design', 'Normalization', 'ERD modelling'] },
  { id: 'platforms', title: 'Platforms and tools', items: ['Linux', 'Docker', 'Git', 'GitHub', 'InfinityFree'] },
]
