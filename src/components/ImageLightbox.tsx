// Visionneuse plein écran (lightbox) pour une image. Overlay sombre, image
// agrandie, fermeture par clic sur le fond ou touche Échap.

import { useEffect } from 'react';

interface ImageLightboxProps {
  url: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ url, alt = 'Image', onClose }: ImageLightboxProps) {
  // Fermeture au clavier (Échap) + blocage du défilement de fond.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
        aria-label="Fermer"
      >
        Fermer ✕
      </button>
      <img
        src={url}
        alt={alt}
        // Empêcher la fermeture quand on clique sur l'image elle-même.
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}
