import React, { createContext, useContext, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface ImageModalContextType {
  openImage: (src: string, alt?: string) => void;
}

const ImageModalContext = createContext<ImageModalContextType | undefined>(undefined);

export function ImageModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');

  const openImage = useCallback((newSrc: string, newAlt?: string) => {
    setSrc(newSrc);
    setAlt(newAlt || '');
    setIsOpen(true);
  }, []);

  return (
    <ImageModalContext.Provider value={{ openImage }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="fixed inset-0 z-50 flex items-center justify-center w-full h-full max-w-none border-none bg-black/90 p-0 shadow-none backdrop-blur-md translate-x-0 translate-y-0 left-0 top-0"
          onClick={() => setIsOpen(false)}
        >
          <DialogTitle className="sr-only">Image Zoom: {alt || 'Gallery Image'}</DialogTitle>

          {/* Main container that ensures centering */}
          <div className="relative flex h-full w-full items-center justify-center p-4">
            {/* Custom close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="fixed right-4 top-4 z-[60] rounded-full bg-white/10 p-3 text-white/70 backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            
            {/* Image container with zoom animation */}
            <div className="relative flex items-center justify-center w-full h-full animate-in zoom-in-95 duration-200">
              <img
                src={src}
                alt={alt}
                className="max-h-[85vh] max-w-[92vw] sm:max-h-[90vh] sm:max-w-[90vw] rounded-xl object-contain shadow-2xl transition-all"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </ImageModalContext.Provider>
  );
}


export function useImageModal() {
  const context = useContext(ImageModalContext);
  if (!context) {
    throw new Error('useImageModal must be used within an ImageModalProvider');
  }
  return context;
}

interface ZoomableImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export function ZoomableImage({ src, alt, className, ...props }: ZoomableImageProps) {
  const { openImage } = useImageModal();

  return (
    <img
      src={src}
      alt={alt}
      loading={props.loading || "lazy"}
      className={`cursor-zoom-in transition-transform hover:scale-[1.01] ${className || ''}`}
      onClick={(e) => {
        e.stopPropagation();
        openImage(src, alt);
      }}
      {...props}
    />

  );
}
