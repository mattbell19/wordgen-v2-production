import { z } from 'zod'

const envSchema = z.object({
  SERPAPI_KEY: z.string(),
  HUMANIZE_API_KEY: z.string(),
  OPENAI_API_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  RAPIDAPI_KEY: z.string().optional(),
  RAPIDAPI_HOST: z.string().optional()
})

// Validate environment variables
export const env = envSchema.parse({
  SERPAPI_KEY: process.env.SERPAPI_KEY,
  HUMANIZE_API_KEY: process.env.HUMANIZE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
  RAPIDAPI_HOST: process.env.RAPIDAPI_HOST
}) 