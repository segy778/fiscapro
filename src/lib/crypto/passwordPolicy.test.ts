import { describe, it, expect } from 'vitest';
import { checkPassword, MIN_PASSWORD_LENGTH } from './passwordPolicy';

describe('checkPassword', () => {
  it.each([
    ['trop court', 'Ab1!'],
    ['8 caractères (ancien minimum)', 'Tigre42!'],
    ['mot courant + chiffres', 'password1234'],
    ['mot courant en français, avec variété', 'Motdepasse2026!'],
    ['nom de l\'app', 'Fiscapro2026!'],
    ['rangée du clavier', 'azertyuiop12'],
    ['suite de chiffres', '123456789012'],
    ['répétition', 'aaaaaaaaaaaaaaaa'],
    ['motif répété', 'abcabcabcabc'],
    ['12 caractères, peu de variété', 'tigrebleu123'],
  ])('refuse : %s', (_label, password) => {
    const r = checkPassword(password);
    expect(r.acceptable).toBe(false);
    expect(r.problems.length).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it.each([
    ['12+ caractères variés', 'Tigre-Bleu-42'],
    ['phrase de passe', 'trois chats mangent des poires'],
    ['accents', 'Élan-Vert-Été-7'],
  ])('accepte : %s', (_label, password) => {
    const r = checkPassword(password);
    expect(r.problems).toEqual([]);
    expect(r.acceptable).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(2);
  });

  it('indique la longueur manquante', () => {
    expect(checkPassword('abc').problems[0]).toContain(`${MIN_PASSWORD_LENGTH} caractères`);
  });

  it('une phrase de passe longue obtient le meilleur score', () => {
    expect(checkPassword('trois chats mangent des poires').score).toBe(4);
  });
});
