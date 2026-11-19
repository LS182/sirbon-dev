import { z } from 'zod'

export const projectSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(120),
  summary: z.string().max(500),
  description: z.string().max(5000).optional(),
  repositoryUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  technologies: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  updatedAt: z.string().datetime().optional(),
})

export const projectInputSchema = projectSchema.omit({
  id: true,
  updatedAt: true,
})

export const postSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500),
  content: z.string().max(20000),
  published: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
})

export type Project = z.infer<typeof projectSchema>
export type ProjectInput = z.infer<typeof projectInputSchema>
export type Post = z.infer<typeof postSchema>

export const enquiryInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  company: z.string().trim().max(160).optional().default(''),
  projectType: z.enum(['web-app', 'api', 'automation', 'consulting', 'other']),
  budget: z.enum(['under-5k', '5k-10k', '10k-25k', '25k-plus', 'not-sure']).optional(),
  description: z.string().trim().min(20).max(5000),
  preferredContact: z.enum(['email', 'phone']),
  phone: z.string().trim().max(40).optional().default(''),
  website: z.string().trim().max(200).optional().default(''),
})

export const reviewInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().min(10).max(2000),
  projectReference: z.string().trim().max(160).optional().default(''),
  website: z.string().trim().max(200).optional().default(''),
})

export type EnquiryInput = z.infer<typeof enquiryInputSchema>
export type ReviewInput = z.infer<typeof reviewInputSchema>

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  summary: z.string().trim().max(500).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  publicSummary: z.string().trim().max(500).nullable().optional(),
  publicDescription: z.string().trim().max(5000).nullable().optional(),
  publicName: z.string().trim().min(1).max(120).nullable().optional(),
  demoUrl: z.string().url().nullable().optional(),
  technologies: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  featured: z.boolean(),
  published: z.boolean(),
  excluded: z.boolean(),
  sortOrder: z.number().int().min(-1000).max(100000),
})

export type ProjectUpdate = z.infer<typeof projectUpdateSchema>
