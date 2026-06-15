// Parsing heuristique du texte OCR d'une facture québécoise.
// Module PUR (pas de dépendance OCR). Extrait montant total, date, TPS, TVQ.
// L'extraction est imparfaite par nature : l'utilisateur confirme/corrige ensuite.

export interface ParsedReceipt {
  /** Montant total en cents, si trouvé. */
  totalCents: number | null;
  /** Date ISO (AAAA-MM-JJ), si trouvée. */
  date: string | null;
  /** TPS en cents, si trouvée. */
  gstCents: number | null;
  /** TVQ en cents, si trouvée. */
  qstCents: number | null;
}

/** Convertit une chaîne de montant (« 12,34 » ou « 12.34 ») en cents. */
function moneyToCents(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Trouve tous les montants ($) dans une ligne. */
function moneyMatches(line: string): number[] {
  const matches = line.match(/\d{1,3}(?:[ .]\d{3})*[.,]\d{2}/g) ?? [];
  return matches.map(moneyToCents).filter((c): c is number => c !== null);
}

/**
 * Extrait la date. Cherche formats courants : AAAA-MM-JJ, JJ/MM/AAAA,
 * JJ-MM-AAAA, et quelques variantes. Retourne la première plausible.
 */
export function extractDate(text: string): string | null {
  // AAAA-MM-JJ
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  // JJ/MM/AAAA ou JJ-MM-AAAA
  const dmy = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  return null;
}

/**
 * Extrait les montants TPS et TVQ en cherchant les lignes qui les mentionnent.
 * TPS/GST ~5 %, TVQ/QST ~9,975 %.
 */
export function extractTaxes(text: string): { gstCents: number | null; qstCents: number | null } {
  let gstCents: number | null = null;
  let qstCents: number | null = null;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const lower = line.toLowerCase();
    const amounts = moneyMatches(line);
    if (amounts.length === 0) continue;
    const last = amounts[amounts.length - 1]!;
    // TPS / GST / TPS
    if (gstCents === null && /\b(tps|gst)\b/.test(lower)) {
      gstCents = last;
    }
    // TVQ / QST / PST
    if (qstCents === null && /\b(tvq|qst|pst)\b/.test(lower)) {
      qstCents = last;
    }
  }
  return { gstCents, qstCents };
}

/**
 * Extrait le montant total. Cherche d'abord une ligne « total » explicite
 * (en évitant « sous-total »), sinon prend le plus grand montant trouvé.
 */
export function extractTotal(text: string): number | null {
  const lines = text.split(/\r?\n/);
  let totalFromKeyword: number | null = null;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/\btotal\b/.test(lower) && !/sous[-\s]?total|subtotal/.test(lower)) {
      const amounts = moneyMatches(line);
      if (amounts.length > 0) {
        totalFromKeyword = amounts[amounts.length - 1]!;
      }
    }
  }
  if (totalFromKeyword !== null) return totalFromKeyword;

  // Repli : le plus grand montant de tout le texte.
  const all = moneyMatches(text.replace(/\n/g, ' '));
  if (all.length === 0) return null;
  return Math.max(...all);
}

/** Parse complet d'un reçu à partir du texte OCR. */
export function parseReceipt(text: string): ParsedReceipt {
  const { gstCents, qstCents } = extractTaxes(text);
  return {
    totalCents: extractTotal(text),
    date: extractDate(text),
    gstCents,
    qstCents,
  };
}
