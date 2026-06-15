import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RowActions } from './RowActions';

describe('RowActions', () => {
  it('affiche les boutons Modifier et Supprimer', () => {
    render(<RowActions onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Modifier')).toBeInTheDocument();
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });

  it('appelle onEdit au clic sur Modifier', () => {
    const onEdit = vi.fn();
    render(<RowActions onEdit={onEdit} onDelete={() => {}} />);
    fireEvent.click(screen.getByText('Modifier'));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('demande confirmation avant de supprimer (deux temps)', () => {
    const onDelete = vi.fn();
    render(<RowActions onEdit={() => {}} onDelete={onDelete} />);
    // Premier clic : pas de suppression, confirmation affichée
    fireEvent.click(screen.getByText('Supprimer'));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Supprimer ?')).toBeInTheDocument();
    // Clic sur Oui : suppression
    fireEvent.click(screen.getByText('Oui'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('annule la confirmation sans supprimer', () => {
    const onDelete = vi.fn();
    render(<RowActions onEdit={() => {}} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Supprimer'));
    fireEvent.click(screen.getByText('Annuler'));
    expect(onDelete).not.toHaveBeenCalled();
    // Retour à l'état initial
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });
});
