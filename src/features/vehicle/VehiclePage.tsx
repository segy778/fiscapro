// Page Véhicule : deux sections — trajets (kilométrage) et frais de véhicule.

import { TripsSection } from './TripsSection';
import { VehicleExpensesSection } from './VehicleExpensesSection';

export function VehiclePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-sapin-600">
          Véhicule {new Date().getFullYear()}
        </p>
        <h1 className="mt-1 font-display text-3xl text-ardoise-900">Kilométrage et frais</h1>
        <p className="mt-2 text-ardoise-500">
          Vos trajets déterminent le ratio d'usage commercial, qui fixe la portion
          déductible de vos frais de véhicule.
        </p>
      </header>

      <TripsSection />

      <hr className="my-10 border-ardoise-200" />

      <VehicleExpensesSection />
    </div>
  );
}
