import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsBar from './StatsBar';

describe('StatsBar', () => {
  it('affiche les 4 statistiques (Total, Terminées, En cours, Urgentes)', () => {
    const stats = { total: 10, completed: 3, pending: 7, urgent: 2 };
    render(<StatsBar stats={stats} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Terminées')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByText('Urgentes')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('affiche 0 pour chaque stat quand stats est vide', () => {
    render(<StatsBar stats={{}} />);
    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(4);
  });
});
