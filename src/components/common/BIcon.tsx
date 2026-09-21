import React from 'react';

export interface BIconProps extends React.HTMLAttributes<HTMLElement> {
  name: string; // e.g. "play-fill", "gear", "folder2-open" or "bi-play-fill"
  className?: string;
  size?: number | string;
}

export const BIcon: React.FC<BIconProps> = ({ name, className = '', size, style, ...props }) => {
  const iconClass = name.startsWith('bi-') ? name : `bi-${name}`;

  const customStyle: React.CSSProperties = { ...style };
  if (size) {
    customStyle.fontSize = typeof size === 'number' ? `${size}px` : size;
  }

  return (
    <i
      className={`bi ${iconClass} ${className}`}
      style={customStyle}
      {...props}
    />
  );
};

export default BIcon;
