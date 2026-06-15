import { describe, it, expect } from 'vitest';
import { parseReceipt, extractDate, extractTaxes, extractTotal } from './parseReceipt';

// Exemple de texte OCR d'une facture québécoise typique.
const sampleReceipt = `
QUINCAILLERIE DU COIN
123 rue Principale, Montréal

Date: 2026-03-15

Vis et boulons          12,50
Peinture                35,00
Sous-total              47,50
TPS (5%)                 2,38
TVQ (9,975%)             4,74
Total                   54,62

Merci de votre visite!
`;

describe('extractDate', () => {
  it('extrait une date ISO', () => {
    expect(extractDate('Date: 2026-03-15')).toBe('2026-03-15');
  });
  it('extrait une date JJ/MM/AAAA', () => {
    expect(extractDate('Facture du 05/03/2026')).toBe('2026-03-05');
  });
  it('retourne null si aucune date', () => {
    expect(extractDate('aucune date ici')).toBeNull();
  });
});

describe('extractTaxes', () => {
  it('extrait TPS et TVQ', () => {
    const t = extractTaxes(sampleReceipt);
    expect(t.gstCents).toBe(238);
    expect(t.qstCents).toBe(474);
  });
  it('retourne null si absentes', () => {
    const t = extractTaxes('Aucune taxe sur ce reçu');
    expect(t.gstCents).toBeNull();
    expect(t.qstCents).toBeNull();
  });
});

describe('extractTotal', () => {
  it('préfère la ligne « Total » au sous-total', () => {
    expect(extractTotal(sampleReceipt)).toBe(5462);
  });
  it('ne confond pas avec le sous-total', () => {
    const text = 'Sous-total 47,50\nTotal 54,62';
    expect(extractTotal(text)).toBe(5462);
  });
  it('repli sur le plus grand montant si pas de mot « total »', () => {
    const text = 'Article A 10,00\nArticle B 25,50';
    expect(extractTotal(text)).toBe(2550);
  });
  it('retourne null si aucun montant', () => {
    expect(extractTotal('aucun montant')).toBeNull();
  });
});

describe('parseReceipt (complet)', () => {
  it('extrait tous les champs d\'une facture type', () => {
    const r = parseReceipt(sampleReceipt);
    expect(r.totalCents).toBe(5462);
    expect(r.date).toBe('2026-03-15');
    expect(r.gstCents).toBe(238);
    expect(r.qstCents).toBe(474);
  });
  it('gère un texte vide gracieusement', () => {
    const r = parseReceipt('');
    expect(r.totalCents).toBeNull();
    expect(r.date).toBeNull();
    expect(r.gstCents).toBeNull();
    expect(r.qstCents).toBeNull();
  });
});
