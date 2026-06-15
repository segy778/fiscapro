// Rappels d'acomptes provisionnels. Module PUR (pas de React, pas de Date.now
// caché : la date « aujourd'hui » est toujours passée en paramètre pour rester
// testable et déterministe).

import type { InstallmentSchedule } from './installments';

export interface UpcomingInstallment {
  dueDate: string;       // ISO 'YYYY-MM-DD'
  totalCents: number;
  /** Nombre de jours entre aujourd'hui et l'échéance (négatif si passée). */
  daysUntil: number;
  /** L'échéance est-elle dans le passé ? */
  isPast: boolean;
}

/** Différence en jours entiers entre deux dates ISO (b - a). */
export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso + 'T00:00:00Z');
  const b = Date.parse(bIso + 'T00:00:00Z');
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Trouve le PROCHAIN versement dû à partir d'aujourd'hui (échéance la plus
 * proche dans le futur, ou aujourd'hui même). null si acomptes non requis ou
 * toutes les échéances passées.
 */
export function nextInstallment(
  schedule: InstallmentSchedule,
  todayIso: string,
): UpcomingInstallment | null {
  if (!schedule.anyRequired) return null;

  const upcoming = schedule.payments
    .map((p) => ({
      dueDate: p.dueDate,
      totalCents: p.totalCents,
      daysUntil: daysBetween(todayIso, p.dueDate),
    }))
    .filter((p) => p.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const next = upcoming[0];
  if (!next) return null;
  return { ...next, isPast: false };
}

/** Échappe les caractères spéciaux pour le format iCalendar (RFC 5545). */
function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Convertit 'YYYY-MM-DD' en 'YYYYMMDD' (date iCalendar). */
function toIcsDate(iso: string): string {
  return iso.replace(/-/g, '');
}

/**
 * Génère un fichier iCalendar (.ics) avec un événement par échéance d'acompte.
 * Chaque événement est une journée entière, avec un rappel (VALARM) la veille.
 * L'utilisateur l'importe dans son calendrier (Google/Apple/Outlook) qui se
 * charge ensuite des notifications — y compris quand l'app est fermée.
 */
export function buildInstallmentsIcs(
  schedule: InstallmentSchedule,
  year: number,
  formatAmount: (cents: number) => string,
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FiscaPro QC//Acomptes//FR',
    'CALSCALE:GREGORIAN',
  ];

  for (const p of schedule.payments) {
    const start = toIcsDate(p.dueDate);
    // DTEND exclusif = lendemain pour un événement « journée entière ».
    const endDate = new Date(Date.parse(p.dueDate + 'T00:00:00Z') + 24 * 60 * 60 * 1000);
    const end = toIcsDate(endDate.toISOString().slice(0, 10));
    const amount = formatAmount(p.totalCents);
    const uid = `acompte-${p.dueDate}@fiscapro-qc`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEscape(`Acompte provisionnel — ${amount}`)}`,
      `DESCRIPTION:${icsEscape(`Versement d'acompte provisionnel ${year} estimé à ${amount} (fédéral + Québec). Estimation FiscaPro QC, à valider.`)}`,
      // Rappel la veille à 9h.
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:-P1D',
      `DESCRIPTION:${icsEscape(`Acompte provisionnel dû demain — ${amount}`)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  // iCalendar exige des fins de ligne CRLF.
  return lines.join('\r\n');
}
