// Compression/redimensionnement d'image avant stockage. Traitement LOCAL
// (canvas du navigateur) — l'image ne quitte jamais l'appareil.

export interface CompressOptions {
  /** Largeur/hauteur max en pixels (le ratio est préservé). */
  maxDimension?: number;
  /** Qualité JPEG 0..1. */
  quality?: number;
}

/**
 * Redimensionne et compresse une image (File/Blob) en JPEG.
 * Réduit fortement le poids des photos de factures tout en restant lisible.
 */
export async function compressImage(
  input: Blob,
  options: CompressOptions = {},
): Promise<Blob> {
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.8;

  const bitmap = await createImageBitmap(input);
  const { width, height } = bitmap;

  // Calcul des dimensions cibles (ratio préservé).
  let targetW = width;
  let targetH = height;
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      targetW = maxDimension;
      targetH = Math.round((height / width) * maxDimension);
    } else {
      targetH = maxDimension;
      targetW = Math.round((width / height) * maxDimension);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Contexte canvas indisponible.');
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Échec de la compression de l\'image.'));
      },
      'image/jpeg',
      quality,
    );
  });
}
