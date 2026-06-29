import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kerfsuite.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/downloads'],
      disallow: ['/portal/', '/login/', '/auth/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
