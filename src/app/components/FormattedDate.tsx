'use client';

import { useEffect, useState } from 'react';

export default function FormattedDate({ date, format = 'short' }: { date: string | Date, format?: 'short' | 'long' | 'dateOnly' }) {
  const [formatted, setFormatted] = useState<string>('');

  useEffect(() => {
    const d = new Date(date);
    if (format === 'dateOnly') {
      setFormatted(d.toLocaleDateString());
    } else if (format === 'long') {
      setFormatted(d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    } else {
      setFormatted(d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    }
  }, [date, format]);

  // Return a placeholder during SSR to avoid hydration mismatch
  if (!formatted) return <span style={{ opacity: 0 }}>...</span>;

  return <span>{formatted}</span>;
}
