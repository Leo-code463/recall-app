import { apiFetch } from './apiClient';

/** Ritaglia al centro in quadrato, ridimensiona a 256x256 e restituisce un data URL JPEG (~20-40 KB). */
export const resizeImageToDataUrl = (file: File, size = 256, quality = 0.82): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Seleziona un file immagine.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas non disponibile.');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossibile leggere l'immagine."));
    };
    img.src = url;
  });

export const uploadAvatar = async (file: File): Promise<string> => {
  const dataUrl = await resizeImageToDataUrl(file);
  const res = await apiFetch('/api/users/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatar: dataUrl }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || 'Caricamento non riuscito.');
  return json.avatarUrl as string;
};

export const removeAvatar = async (): Promise<void> => {
  const res = await apiFetch('/api/users/avatar', { method: 'DELETE' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || 'Rimozione non riuscita.');
};
