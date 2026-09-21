import React from 'react';
import logoImg from '../../assets/logo.png';

interface AppLogoProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'icon' | 'badge';
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 36, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center rounded-xl overflow-hidden shadow-md shadow-cyan-500/20 transition-transform hover:scale-105 select-none shrink-0 ${className}`}
    >
      <img
        src={logoImg}
        alt="SV Browser Logo"
        className="w-full h-full object-cover rounded-xl"
        draggable={false}
      />
    </div>
  );
};
