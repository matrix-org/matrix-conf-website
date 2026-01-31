import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const talks = defineCollection({
    loader: glob({pattern: "**/session.json", base: "./src/talks"}),
    schema: z.object({
        ID: z.string(),
        "Proposal title": z.string(),
        Abstract: z.string(),
        Track: z.object({
            en: z.string()
        }).optional(),
        "Speaker names": z.array(z.string()),
        Room: z.object({
            en: z.string()
        }),
        Start: z.string(),
        youtube: z.string().url().optional()
    })
});

export const collections = { "talks": talks };
