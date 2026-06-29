import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | KerfSuite Portal',
    default: 'KerfSuite Portal',
  },
};

/**
 * Portal layout — auth guard only.
 * All visual layout (sidebar etc.) is handled per-page or via page.module.css.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <>{children}</>;
}
