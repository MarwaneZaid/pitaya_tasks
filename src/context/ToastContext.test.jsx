import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from './ToastContext.jsx';

function Probe() {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast({ message: 'Hello', variant: 'success' })}>
      go
    </button>
  );
}

describe('ToastProvider', () => {
  it('affiche une notification puis la ferme au clic', async () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'go' }));
    });
    expect(screen.getByText('Hello')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }));
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });
});
