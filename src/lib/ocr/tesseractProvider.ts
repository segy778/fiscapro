// Implémentation OCR locale via Tesseract.js. Tourne entièrement dans le
// navigateur — aucune donnée image ne quitte l'appareil (aligné Loi 25).
//
// Les chemins du worker, du core et des données de langue sont configurables.
// Par défaut, Tesseract.js les charge depuis un CDN; pour un vrai local-first
// sans dépendance externe à l'exécution, on peut les servir avec l'app
// (voir options workerPath/corePath/langPath ci-dessous).

// Import de type seulement : la bibliothèque est chargée à la demande
// (premier scan de facture) pour ne pas alourdir le chargement initial.
import type Tesseract from 'tesseract.js';
import type { OcrProvider, OcrResult, OcrProgress } from './OcrProvider';

export interface TesseractOptions {
  /** Langue (défaut 'fra'). */
  lang?: string;
  /** Chemin du worker (si servi localement). */
  workerPath?: string;
  /** Chemin des fichiers core WASM. */
  corePath?: string;
  /** Chemin des données de langue. */
  langPath?: string;
}

export class TesseractProvider implements OcrProvider {
  private worker: Tesseract.Worker | null = null;
  private readonly options: TesseractOptions;

  constructor(options: TesseractOptions = {}) {
    this.options = options;
  }

  private async getWorker(onProgress?: OcrProgress): Promise<Tesseract.Worker> {
    if (this.worker) return this.worker;
    const lang = this.options.lang ?? 'fra';
    // Options de chargement : seules celles fournies sont passées, sinon
    // Tesseract utilise ses valeurs CDN par défaut.
    const workerOptions: Partial<Tesseract.WorkerOptions> = {
      logger: (m: { status: string; progress: number }) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(m.progress);
        }
      },
    };
    if (this.options.workerPath) workerOptions.workerPath = this.options.workerPath;
    if (this.options.corePath) workerOptions.corePath = this.options.corePath;
    if (this.options.langPath) workerOptions.langPath = this.options.langPath;

    const { createWorker } = await import('tesseract.js');
    this.worker = await createWorker(lang, 1, workerOptions);
    return this.worker;
  }

  async recognize(image: Blob | string, onProgress?: OcrProgress): Promise<OcrResult> {
    const worker = await this.getWorker(onProgress);
    const { data } = await worker.recognize(image);
    return { text: data.text, confidence: data.confidence };
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
