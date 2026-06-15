// Carte de statistique réutilisable pour le tableau de bord.

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  emphasis?: 'normal' | 'positive' | 'warning';
}

const emphasisStyles: Record<NonNullable<StatCardProps['emphasis']>, string> = {
  normal: 'text-ardoise-900',
  positive: 'text-sapin-700',
  warning: 'text-ambre-700',
};

export function StatCard({ label, value, hint, emphasis = 'normal' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-ardoise-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ardoise-500">
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl tabular-nums ${emphasisStyles[emphasis]}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-sm text-ardoise-500">{hint}</p>}
    </div>
  );
}
