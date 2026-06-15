import { describe, it, expect } from 'vitest';
import { daysBetween, nextInstallment, buildInstallmentsIcs } from './reminders';
import type { InstallmentSchedule } from './installments';

function schedule(overrides: Partial<InstallmentSchedule> = {}): InstallmentSchedule {
  return {
    federalRequired: true,
    quebecRequired: true,
    anyRequired: true,
    federalThresholdCents: 300000,
    quebecThresholdCents: 180000,
    federalTaxCents: 500000,
    provincialTaxCents: 400000,
    federalPerInstallmentCents: 125000,
    quebecPerInstallmentCents: 100000,
    payments: [
      { dueDate: '2026-03-15', federalCents: 125000, quebecCents: 100000, totalCents: 225000 },
      { dueDate: '2026-06-15', federalCents: 125000, quebecCents: 100000, totalCents: 225000 },
      { dueDate: '2026-09-15', federalCents: 125000, quebecCents: 100000, totalCents: 225000 },
      { dueDate: '2026-12-15', federalCents: 125000, quebecCents: 100000, totalCents: 225000 },
    ],
    ...overrides,
  };
}

describe('daysBetween', () => {
  it('compte les jours entre deux dates', () => {
    expect(daysBetween('2026-03-01', '2026-03-15')).toBe(14);
    expect(daysBetween('2026-03-15', '2026-03-15')).toBe(0);
    expect(daysBetween('2026-03-20', '2026-03-15')).toBe(-5);
  });

  it('gère le passage de mois', () => {
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1); // 2026 non bissextile
  });
});

describe('nextInstallment', () => {
  it('retourne la prochaine échéance future', () => {
    const next = nextInstallment(schedule(), '2026-05-01');
    expect(next?.dueDate).toBe('2026-06-15');
    expect(next?.daysUntil).toBe(45);
    expect(next?.totalCents).toBe(225000);
  });

  it('inclut une échéance le jour même (daysUntil 0)', () => {
    const next = nextInstallment(schedule(), '2026-06-15');
    expect(next?.dueDate).toBe('2026-06-15');
    expect(next?.daysUntil).toBe(0);
  });

  it('retourne la première échéance si on est avant toutes', () => {
    const next = nextInstallment(schedule(), '2026-01-01');
    expect(next?.dueDate).toBe('2026-03-15');
  });

  it('retourne null si toutes les échéances sont passées', () => {
    const next = nextInstallment(schedule(), '2026-12-16');
    expect(next).toBeNull();
  });

  it('retourne null si les acomptes ne sont pas requis', () => {
    const next = nextInstallment(schedule({ anyRequired: false }), '2026-05-01');
    expect(next).toBeNull();
  });
});

describe('buildInstallmentsIcs', () => {
  const fmt = (cents: number) => `${(cents / 100).toFixed(2)} $`;

  it('génère un VCALENDAR avec un événement par échéance', () => {
    const ics = buildInstallmentsIcs(schedule(), 2026, fmt);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(4);
  });

  it('utilise des dates iCalendar et un rappel la veille', () => {
    const ics = buildInstallmentsIcs(schedule(), 2026, fmt);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260315');
    expect(ics).toContain('DTEND;VALUE=DATE:20260316'); // lendemain (exclusif)
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('BEGIN:VALARM');
  });

  it('utilise des fins de ligne CRLF (RFC 5545)', () => {
    const ics = buildInstallmentsIcs(schedule(), 2026, fmt);
    expect(ics.includes('\r\n')).toBe(true);
  });

  it('inclut le montant formaté dans le résumé', () => {
    const ics = buildInstallmentsIcs(schedule(), 2026, fmt);
    expect(ics).toContain('2250.00 $');
  });
});
