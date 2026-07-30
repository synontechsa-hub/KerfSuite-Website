import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

describe('search-engine discovery metadata', () => {
  it('publishes only canonical public marketing pages', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://kerf-suite.com/';

    const entries = sitemap();

    expect(entries.map(({ url }) => url)).toEqual([
      'https://kerf-suite.com/',
      'https://kerf-suite.com/downloads',
    ]);
    expect(entries.every(({ lastModified }) => lastModified instanceof Date)).toBe(true);
    expect(entries.some(({ url }) => /\/(portal|login|signup|join|auth|api)(\/|$)/.test(url))).toBe(false);
  });

  it('advertises one canonical sitemap and blocks non-public routes', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://kerf-suite.com/';

    const metadata = robots();
    const rule = Array.isArray(metadata.rules) ? metadata.rules[0] : metadata.rules;

    expect(metadata.sitemap).toBe('https://kerf-suite.com/sitemap.xml');
    expect(metadata.host).toBe('https://kerf-suite.com');
    expect(rule.allow).toEqual(['/', '/downloads']);
    expect(rule.disallow).toEqual([
      '/portal',
      '/login',
      '/signup',
      '/join',
      '/auth',
      '/api',
    ]);
  });
});