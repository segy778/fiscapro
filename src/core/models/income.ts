// Modèles Income et Expense. Montants en CENTS.

export interface Income {
  id: string;
  date: string;              // ISO 8601
  amountCents: number;
  client?: string;
  description?: string;
  gstQstCollected?: boolean;
  /** Montants de taxe perçue, si ajustés manuellement (sinon calculés). */
  gstCents?: number;
  qstCents?: number;
}

export interface Expense {
  id: string;
  date: string;              // ISO 8601
  amountCents: number;
  category: string;          // clé de config.expenseCategories
  /** % déductible 0..1, déduit de la catégorie mais surchargeable. */
  deductiblePercent: number;
  description?: string;
  receiptImageId?: string;
  gstCents?: number;
  qstCents?: number;
}
