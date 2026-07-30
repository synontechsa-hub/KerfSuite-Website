import type { MetadataRoute } from 'next';

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://kerf-suite.com').replace(/\/+$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/downloads`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}