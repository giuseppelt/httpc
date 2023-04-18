import { z, defineCollection } from "astro:content";

const docs = defineCollection({
    schema: z.object({
        draft: z.boolean().optional(),
        title: z.string(),
        shortTitle: z.string().optional(),
        status: z.enum(["working in progress"]).optional(),
        description: z.string().optional(),
        summary: z.string().optional(),
    })
});

export const BlogTags = ([
    "announcements",
    "ergonomics",
    "patterns",
    "release",
    "typescript",
    "type-safety",
] as const);

const blog = defineCollection({
    schema: z.object({
        draft: z.boolean().optional(),
        title: z.string(),
        shortTitle: z.string().optional(),
        description: z.string().optional(),
        summary: z.string().optional(),
        tags: z.array(z.enum(BlogTags)).min(1),
        publishedAt: z.date(),
    })
});

export const collections = {
    docs,
    blog,
};
