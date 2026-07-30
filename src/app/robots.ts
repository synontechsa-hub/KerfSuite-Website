import type { MetadataRoute } from 'next';

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kerf-suite.com').replace(/\/+$/, '');
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/downloads'],
      disallow: ['/portal', '/login', '/signup', '/join', '/auth', '/api'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}