import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import IndustrialModal from '@/app/components/IndustrialModal';

describe('IndustrialModal', () => {
  it('renders correctly when open', () => {
    render(
      <IndustrialModal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        message="Test Message"
      />
    );

    expect(screen.getByText('TEST MODAL')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <IndustrialModal
        isOpen={false}
        onClose={() => {}}
        title="Test Modal"
        message="Test Message"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('calls onClose when clicking the close button', () => {
    const handleClose = jest.fn();
    render(
      <IndustrialModal
        isOpen={true}
        onClose={handleClose}
        title="Test"
        message="Test"
      />
    );

    fireEvent.click(screen.getByText('✕'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm and onClose when clicking the confirm button', () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();
    render(
      <IndustrialModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Test"
        message="Test"
        confirmText="Yes"
      />
    );

    fireEvent.click(screen.getByText('YES'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies danger styling when variant is danger', () => {
    render(
      <IndustrialModal
        isOpen={true}
        onClose={() => {}}
        title="Danger"
        message="Danger"
        variant="danger"
      />
    );

    const title = screen.getByText('DANGER');
    expect(title).toHaveStyle('color: var(--status-error)');
  });
});
