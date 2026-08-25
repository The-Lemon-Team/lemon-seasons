import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  containerClassName?: string;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  showDefaultHeader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerExtra,
  children,
  maxWidth = 'max-w-lg',
  containerClassName = '',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  showDefaultHeader = true,
}) => {
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      closeOnOverlayClick &&
      e.target === e.currentTarget &&
      mouseDownTargetRef.current === e.currentTarget
    ) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  };

  const hasHeader = showDefaultHeader && (title || showCloseButton || icon || subtitle);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <div
        className={`relative w-full ${maxWidth} bg-[#181a1a] border border-[#2d3030] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${containerClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {hasHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#242828] bg-[#141616]">
            <div className="flex items-center gap-3">
              {icon && <div className="shrink-0">{icon}</div>}
              <div>
                {title && (
                  <h3 className="font-sans font-bold text-sm sm:text-base text-[#f3e8ff]">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-[11px] font-mono text-[#93927e]">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {headerExtra}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-md text-[#93927e] hover:text-white hover:bg-[#242828] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
