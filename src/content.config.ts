import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({
    pattern: "**/index.md",
    base: "./src/content/posts",
  }),

  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      publishedDate: z.coerce.date(),
      category: z.string(),
      tags: z.array(z.string()),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      banner: image().optional(),
    }),
});

export const collections = {
  posts,
};
