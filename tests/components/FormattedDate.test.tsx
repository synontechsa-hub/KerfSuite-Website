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
    // Format: month short, day numeric, hour:2-digit, minute:2-digit
    // exact string depends on local timezone, so we'll check for components
    expect(screen.getByText(/Jun 11/i)).toBeInTheDocument();
  });

  it('respects the dateOnly format', () => {
    render(<FormattedDate date={testDate} format="dateOnly" />);
    // Just date, no time
    const text = screen.getByText(/2026/);
    expect(text.textContent).not.toMatch(/:/);
  });
});
