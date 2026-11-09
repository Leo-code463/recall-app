import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { Check, X, ZoomIn } from 'lucide-react';

interface ProfileImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

export const ProfileImageCropper: React.FC<ProfileImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error('Errore durante il ritaglio dell\'immagine:', e);
    } finally {
      setLoading(false);
    }
  };

  // Montato direttamente sul document.body tramite Portal
  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1C1C24] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-white/20 dark:border-white/10 flex flex-col items-center my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-extrabold text-[#16161E] dark:text-white mb-3">
          Ritaglia la foto profilo
        </h3>

        {/* Contenitore Cropper con sfondo nero ed elezione proporzionale */}
        <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-black border border-black/10">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={handleCropComplete}
            style={{
              containerStyle: { width: '100%', height: '100%', borderRadius: '1rem', background: '#000000' },
              cropAreaStyle: { border: '2px solid #6A49D8', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)' }
            }}
          />
        </div>

        {/* Controllo Zoom */}
        <div className="w-full flex items-center gap-3 my-4 px-2">
          <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-label="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[#6A49D8] cursor-pointer h-1.5 bg-gray-200 dark:bg-neutral-800 rounded-lg appearance-none"
          />
        </div>

        {/* Pulsanti di Azione */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-neutral-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Annulla</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#6A49D8] hover:bg-[#5B3CC4] text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Salvataggio...' : 'Conferma'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};