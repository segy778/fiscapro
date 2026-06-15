// Formatage monétaire et de dates. Source de vérité : montants en CENTS.
// Le formatage en dollars se fait UNIQUEMENT à l'affichage (CLAUDE.md).

const cadFormatter = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
});

/** Convertit des cents (entier) en chaîne « 1 234,56 $ » au format fr-CA. */
export function formatCents(cents: number): string {
  return cadFormatter.format(cents / 100);
}

/** Convertit des cents en dollars (nombre) — pour calculs d'affichage seulement. */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/** Formate une date ISO 8601 (AAAA-MM-JJ) en fr-CA lisible. */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return dateFormatter.format(d);
}

const dateShortFormatter = new Intl.DateTimeFormat('fr-CA', {
  month: 'long',
  day: 'numeric',
});

/** Formate une date ISO en court (« 15 mars »). */
export function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return dateShortFormatter.format(d);
}

const kmFormatter = new Intl.NumberFormat('fr-CA');

/** Formate un nombre de kilomètres au format fr-CA (« 1 234 km »). */
export function formatKm(km: number): string {
  return `${kmFormatter.format(km)} km`;
}
