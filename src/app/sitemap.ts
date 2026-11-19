import type { MetadataRoute } from 'next';
import { getAllProjects } from '@/lib/content/repository';
import { site } from '@/data/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const projects = getAllProjects();

  return [
    { url: site.url, changeFrequency: 'monthly', priority: 1 },
    { url: `${site.url}/projects`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${site.url}/resume`, changeFrequency: 'monthly', priority: 0.8 },
    ...projects.map((p) => ({
      url: `${site.url}/projects/${p.slug}`,
      lastModified: new Date(`${p.updatedAt}T00:00:00Z`),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
