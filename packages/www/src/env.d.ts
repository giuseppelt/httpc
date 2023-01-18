/// <reference types="astro/client" />

interface Frontmatter {
    title: string
    shortTitle?: string
    description?: string
    summary?: string
    draft?: boolean
    status?: string
    tags?: string[]
    publishedAt?: Date
}
