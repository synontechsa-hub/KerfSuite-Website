import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Sign In',
  description: 'Secure KerfSuite Portal sign-in for workspace members and administrators.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
