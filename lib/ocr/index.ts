// Point d'accès unique à la couche OCR. Le reste de l'app importe `ocr`
// sans connaître l'implémentation concrète.
//
// Les ressources Tesseract (worker, core WASM, données de langue françaises)
// sont servies LOCALEMENT depuis /tesseract/ (dossier public). Aucune dépendance
// CDN à l'exécution : tout reste sur l'appareil, conforme au principe local-first
// et à la Loi 25.

import type { OcrProvider } from './OcrProvider';
import { TesseractProvider } from './tesseractProvider';

export type { OcrProvider, OcrResult, OcrProgress } from './OcrProvider';

const TESSERACT_BASE = '/tesseract';

/** Instance OCR de l'application (Tesseract local, ressources servies avec l'app). */
export const ocr: OcrProvider = new TesseractProvider({
  lang: 'fra',
  workerPath: `${TESSERACT_BASE}/worker.min.js`,
  corePath: TESSERACT_BASE,
  langPath: TESSERACT_BASE,
});
