import React from 'react';

interface NPULogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  showText?: boolean;
}

export const NPULogo: React.FC<NPULogoProps> = ({ 
  className = '', 
  size = 'md',
}) => {
  // Size presets (aspect ratio ~ 5:7 matching official emblem)
  const sizeClasses = {
    xs: 'w-6 h-8',
    sm: 'w-9 h-12',
    md: 'w-16 h-22',
    lg: 'w-24 h-34',
    xl: 'w-32 h-44',
    custom: ''
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none shrink-0 ${size !== 'custom' ? sizeClasses[size] : ''} ${className}`}>
      <img
        src="/npu-logo.png"
        onError={(e) => {
          // Fallback to SVG if PNG is not accessible
          (e.currentTarget as HTMLImageElement).src = '/npu-logo.svg';
        }}
        alt="ตราประจำมหาวิทยาลัยนครพนม (Nakhon Phanom University Emblem)"
        className="w-full h-full object-contain drop-shadow-xs"
        referrerPolicy="no-referrer"
        loading="eager"
      />
    </div>
  );
};
