// Interface OCR abstraite — AUCUNE dépendance à Tesseract ici.
// Contrat que toute implémentation (Tesseract local, service cloud...) respecte.
// Le reste de l'app ne dépend que de cette interface.

/** Résultat brut d'une reconnaissance OCR. */
export interface OcrResult {
  /** Texte brut reconnu. */
  text: string;
  /** Indice de confiance global (0..100), si disponible. */
  confidence?: number;
}

/** Progrès d'une opération OCR (0..1). */
export type OcrProgress = (ratio: number) => void;

export interface OcrProvider {
  /**
   * Reconnaît le texte d'une image (Blob/File ou data URL).
   * onProgress (optionnel) est appelé pendant le traitement.
   */
  recognize(image: Blob | string, onProgress?: OcrProgress): Promise<OcrResult>;

  /** Libère les ressources (workers, etc.). */
  terminate(): Promise<void>;
}
