// Vignette d'une facture jointe, affichée dans la liste des dépenses.
// Charge l'image paresseusement depuis le stockage (déchiffrée si besoin),
// révoque proprement l'URL objet, et ouvre la lightbox plein écran au clic.

import { useState, useEffect } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import { ImageLightbox } from '../../components/ImageLightbox';

interface ReceiptThumbnailProps {
  imageId: string;
}

export function ReceiptThumbnail({ imageId }: ReceiptThumbnailProps) {
  const getReceiptImage = useFiscalStore((s) => s.getReceiptImage);
  const [url, setUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
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
  }, [imageId, getReceiptImage]);

  // Tant que l'image n'est pas chargée, réserver l'espace (évite les sauts).
  if (!url) {
    return <div className="h-10 w-10 shrink-0 rounded border border-ardoise-200 bg-ardoise-100" aria-hidden />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className="h-10 w-10 shrink-0 cursor-zoom-in overflow-hidden rounded border border-ardoise-200 transition hover:border-sapin-600 hover:ring-1 hover:ring-sapin-600/20"
        aria-label="Agrandir la facture"
      >
        <img src={url} alt="Facture" className="h-full w-full object-cover" />
      </button>
      {zoomed && <ImageLightbox url={url} alt="Facture jointe" onClose={() => setZoomed(false)} />}
    </>
  );
}
