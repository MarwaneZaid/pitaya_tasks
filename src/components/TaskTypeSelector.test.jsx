import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskTypeSelector from './TaskTypeSelector';
import { TASK_TYPE_ANNEXE, TASK_TYPE_QUOTIDIEN } from '../config/constants';

describe('TaskTypeSelector', () => {
  it('appelle onChange avec le type sélectionné', () => {
    const onChange = vi.fn();
    render(<TaskTypeSelector value={TASK_TYPE_ANNEXE} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /quotidien/i }));
    expect(onChange).toHaveBeenCalledWith(TASK_TYPE_QUOTIDIEN);
  });

  it('marque le type actif avec aria-pressed', () => {
    render(<TaskTypeSelector value={TASK_TYPE_QUOTIDIEN} onChange={() => {}} />);
    const quotidien = screen.getByRole('button', { name: /quotidien/i });
    expect(quotidien).toHaveAttribute('aria-pressed', 'true');
    const annexe = screen.getByRole('button', { name: /annexe/i });
    expect(annexe).toHaveAttribute('aria-pressed', 'false');
  });
});
