import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join a Workspace',
  description: 'Accept a secure invitation to join an existing KerfSuite workspace.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
