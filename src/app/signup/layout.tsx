import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create a Workspace',
  description: 'Create a KerfSuite workspace for secure licence, machine, and user administration.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
