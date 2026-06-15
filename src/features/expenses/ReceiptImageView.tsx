// Affiche l'image de facture attachée (chargée depuis le stockage par id).
// Gère la création/révocation de l'URL objet.

import { useState, useEffect } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { ImageLightbox } from '../../components/ImageLightbox';

interface ReceiptImageViewProps {
  /** id de l'image dans le stockage (si attachée à une dépense existante). */
  imageId?: string;
  /** URL d'aperçu directe (si on vient d'attacher une image, pas encore enregistrée). */
  previewUrl?: string | null;
  /** Si fourni, affiche un bouton « Retirer » qui appelle ce callback. */
  onDetach?: () => void;
}

export function ReceiptImageView({ imageId, previewUrl, onDetach }: ReceiptImageViewProps) {
  const getReceiptImage = useFiscalStore((s) => s.getReceiptImage);
  const [url, setUrl] = useState<string | null>(previewUrl ?? null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (previewUrl) {
      setUrl(previewUrl);
      return;
    }
    if (!imageId) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    void getReceiptImage(imageId).then((blob) => {
      if (blob && !cancelled) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId, previewUrl, getReceiptImage]);

  if (!url) return null;

  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ardoise-500">
          Facture jointe
        </p>
        {onDetach && (
          <button
            type="button"
            onClick={onDetach}
            className="text-xs text-ardoise-500 hover:text-red-700"
          >
            Retirer
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className="block cursor-zoom-in rounded-lg border border-ardoise-200 transition hover:border-sapin-600 hover:ring-1 hover:ring-sapin-600/20"
        aria-label="Agrandir la facture"
      >
        <img
          src={url}
          alt="Facture jointe"
          className="max-h-48 rounded-lg object-contain"
        />
      </button>
      {zoomed && (
        <ImageLightbox url={url} alt="Facture jointe" onClose={() => setZoomed(false)} />
      )}
    </div>
  );
}
