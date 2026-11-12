// Types décrivant la structure du fichier src/config/fiscal/<année>.json.
// Aucun chiffre fiscal ici — uniquement la forme des données.
// Tous les montants sont en CENTS (entiers).

export interface TaxBracket {
  /** Borne supérieure de la tranche en cents. null = tranche la plus élevée (au-delà). */
  upToCents: number | null;
  /** Taux marginal appliqué à la portion de revenu dans cette tranche (0..1). */
  rate: number;
}

export interface BasicPersonalAmount {
  federalCents: number;
  quebecCents: number;
}

export interface QuebecAbatement {
  /** Réduction appliquée à l'impôt fédéral de base (ex. 0.165). */
  rate: number;
}

/** Traitement fiscal d'une composante de cotisation. */
export type TaxTreatment = 'credit' | 'deduction' | 'none';

/** Composante de base du RRQ (part employé et employeur traitées différemment). */
export interface RrqBaseComponent {
  /** Taux total (deux parts) appliqué à l'assiette. */
  totalRate: number;
  fromCents: number;
  toCents: number;
  federalEmployeeTreatment: TaxTreatment;
  federalEmployerTreatment: TaxTreatment;
  quebecEmployeeTreatment: TaxTreatment;
  quebecEmployerTreatment: TaxTreatment;
}

/** Composante supplémentaire (bonifiée) du RRQ — entièrement déductible. */
export interface RrqAdditionalComponent {
  totalRate: number;
  fromCents: number;
  toCents: number;
  federalTreatment: TaxTreatment;
  quebecTreatment: TaxTreatment;
}

export interface RrqParams {
  basicExemptionCents: number;
  maxPensionableEarningsCents: number;          // MGA
  additionalMaxPensionableEarningsCents: number; // MSGA
  /** Fraction de la cotisation attribuée à la part « employé » (0.5). */
  employeeShare: number;
  components: {
    base: RrqBaseComponent;
    firstAdditional: RrqAdditionalComponent;
    secondAdditional: RrqAdditionalComponent;
  };
}

export interface RqapParams {
  selfEmployedRate: number;
  maxInsurableEarningsCents: number;            // MRA
  employeeShare: number;
}

export interface CreditRates {
  federal: number;
  quebec: number;
}

export interface SalesTaxParams {
  gstRate: number;
  qstRate: number;
}

export interface InstallmentParams {
  federalThresholdCents: number;
  quebecThresholdCents: number;
  dueDates: string[];
}

export interface ExpenseCategoryConfig {
  label: string;
  /** Pourcentage déductible fixe (0..1). Absent si vehicleProRata. */
  deductiblePercent?: number;
  /** true si la portion déductible dépend du ratio d'usage du véhicule. */
  vehicleProRata?: boolean;
  /** Type de frais de véhicule correspondant (catégories au prorata seulement). */
  vehicleKind?: 'essence' | 'entretien' | 'assurance' | 'immatriculation' | 'autre';
}

export interface VehicleSalesTaxParams {
  /** Par type de frais : true si assujetti à la TPS/TVQ (donc récupérable). */
  taxableKinds: Record<'essence' | 'entretien' | 'assurance' | 'immatriculation' | 'autre', boolean>;
}

export interface FiscalConfig {
  year: number;
  currency: string;
  amountUnit: 'cents';
  federalBrackets: TaxBracket[];
  quebecBrackets: TaxBracket[];
  basicPersonalAmount: BasicPersonalAmount;
  quebecAbatement: QuebecAbatement;
  rrq: RrqParams;
  rqap: RqapParams;
  creditRates: CreditRates;
  salesTax: SalesTaxParams;
  installments: InstallmentParams;
  vehicleSalesTax: VehicleSalesTaxParams;
  expenseCategories: Record<string, ExpenseCategoryConfig>;
}
