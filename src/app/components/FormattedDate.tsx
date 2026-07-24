'use client';

import { useEffect, useState } from 'react';

export default function FormattedDate({ date, format = 'short' }: { date: string | Date, format?: 'short' | 'long' | 'dateOnly' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only run on client after first render to ensure consistency
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return <span style={{ opacity: 0 }}>...</span>;
  }

  const d = new Date(date);
  let formatted = '';

  if (format === 'dateOnly') {
    formatted = d.toLocaleDateString();
  } else if (format === 'long') {
    formatted = d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } else {
    formatted = d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return <span>{formatted}</span>;
}
