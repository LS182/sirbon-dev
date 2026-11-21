import { describe, expect, it } from 'vitest'
import { profile } from '../src/features/about'
import { education, experience } from '../src/features/experience'
import { caseStudies } from '../src/features/projects'
import { skillGroups } from '../src/features/skills'

describe('portfolio personal authenticity and content integrity', () => {
  it('preserves Liam identity and verified education facts', () => {
    expect(profile.name).toBe('Liam Victor Sirbon')
    expect(profile.location).toContain('Cape Town')
    expect(education).toEqual(expect.arrayContaining([
      expect.objectContaining({ period: '2024', title: 'Higher Certificate' }),
      expect.objectContaining({ title: 'Diploma in IT Applications Development', period: '2025–2027' }),
    ]))
    expect(experience.map((item) => item.title)).toEqual(expect.arrayContaining([
      'Class representative',
      'Group leader',
    ]))
  })

  it('keeps academic projects strictly evidence-backed without fabricated extras', () => {
    expect(caseStudies).toHaveLength(2)
    const studentRent = caseStudies.find((study) => study.slug === 'studentrent')
    const dinnerClub = caseStudies.find((study) => study.slug === 'tee2pin-dinner-club')
    expect(studentRent?.kind).toBe('University group project')
    expect(studentRent?.technologies).toEqual(expect.arrayContaining(['React', 'PHP REST API', 'MySQL']))
    expect(dinnerClub?.kind).toBe('Database design assignment')
    expect(dinnerClub?.contribution.join(' ')).toContain('3NF')
  })

  it('groups technical skills without fabricated percentages', () => {
    expect(skillGroups.map((group) => group.title)).toEqual(expect.arrayContaining([
      'Programming languages',
      'Frontend development',
      'Backend development',
      'Mobile development',
      'Databases',
      'Platforms and tools',
    ]))
  })
})
