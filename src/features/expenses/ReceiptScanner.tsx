// Capture/téléversement d'une facture, OCR local, et extraction des champs.
// L'utilisateur confirme/corrige ensuite dans le formulaire (parcours du PRD).

import { useState, useRef } from 'react';
import { ocr } from '../../lib/ocr';
import { parseReceipt, type ParsedReceipt } from '../../lib/ocr/parseReceipt';
import { Button } from '../../components/FormField';

interface ReceiptScannerProps {
  /** Appelé quand l'extraction est prête, avec les champs détectés. */
  onExtracted: (parsed: ParsedReceipt) => void;
  /** Appelé avec le fichier image original (pour stockage comme justificatif). */
  onImage?: (file: File) => void;
}

export function ReceiptScanner({ onExtracted, onImage }: ReceiptScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setStatus('working');
    setProgress(0);
    setMessage(null);
    onImage?.(file); // conserver l'image comme pièce justificative
    try {
      const result = await ocr.recognize(file, (ratio) => setProgress(ratio));
      const parsed = parseReceipt(result.text);
      setStatus('done');
      const found: string[] = [];
      if (parsed.totalCents !== null) found.push('montant');
      if (parsed.date !== null) found.push('date');
      if (parsed.gstCents !== null) found.push('TPS');
      if (parsed.qstCents !== null) found.push('TVQ');
      setMessage(
        found.length > 0
          ? `Détecté : ${found.join(', ')}. Vérifiez et corrigez au besoin.`
          : "Rien n'a pu être extrait automatiquement. Saisissez les champs manuellement.",
      );
      onExtracted(parsed);
    } catch {
      setStatus('error');
      setMessage("L'analyse de l'image a échoué. Réessayez ou saisissez manuellement.");
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-dashed border-ardoise-300 bg-ardoise-50 p-4">
      <p className="mb-1 text-sm font-medium text-ardoise-700">Photo de facture</p>
      <p className="mb-3 text-xs text-ardoise-500">
        L'analyse se fait sur votre appareil; l'image n'est pas envoyée ailleurs.
        La première utilisation télécharge les données de langue (quelques secondes).
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      <Button onClick={() => inputRef.current?.click()} variant="ghost" disabled={status === 'working'}>
        {status === 'working' ? 'Analyse en cours…' : 'Choisir une photo'}
      </Button>

      {status === 'working' && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ardoise-200">
            <div
              className="h-full bg-sapin-600 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-ardoise-500">{Math.round(progress * 100)} %</p>
        </div>
      )}

      {message && (
        <p className={`mt-2 text-sm ${status === 'error' ? 'text-ambre-700' : 'text-sapin-700'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
