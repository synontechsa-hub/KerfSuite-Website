import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | KerfSuite',
    default: 'KerfSuite — The Workshop Operating System',
  },
  description: 'A precision utility suite for serious workshops. Algorithmic cut optimization, real-time inventory, and unified license management.',
  openGraph: {
    siteName: 'KerfSuite',
    type: 'website',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
