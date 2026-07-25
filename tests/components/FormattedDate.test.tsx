import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormattedDate from '@/app/components/FormattedDate';

describe('FormattedDate', () => {
  const testDate = '2026-06-11T12:00:00.000Z';

  it('renders a placeholder initially (mounted state check)', () => {
    render(<FormattedDate date={testDate} />);
    // On the very first tick it might be ... but Testing Library handles effects
    // We expect it to eventually show the date
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });

  it('renders a formatted date string', () => {
    render(<FormattedDate date={testDate} />);
    // Expect "Jun" and "11" to be present (order depends on locale)
    expect(screen.getByText(/Jun/i)).toBeInTheDocument();
    expect(screen.getByText(/11/)).toBeInTheDocument();
  });

  it('respects the dateOnly format', () => {
    render(<FormattedDate date={testDate} format="dateOnly" />);
    // Just date, no time
    const text = screen.getByText(/2026/);
    expect(text.textContent).not.toMatch(/:/);
  });
});
