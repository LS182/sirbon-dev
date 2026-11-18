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
