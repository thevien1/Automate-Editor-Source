import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { VariableMeta, getVariableMeta } from '../../data/variablesMetadata';
import { Copy, Check } from './Icons';

interface VariableBadgeProps {
  varName: string;
  badgeColor?: string;
  isGrid?: boolean;
  onCopy: (name: string) => void;
  isCopied?: boolean;
}

export const VariableBadge: React.FC<VariableBadgeProps> = ({
  varName,
  badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  isGrid = false,
  onCopy,
  isCopied = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const cleanName = varName.startsWith('$') ? varName.substring(1) : varName;
  const meta: VariableMeta = getVariableMeta(cleanName);

  const handleMouseEnter = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      const tooltipWidth = 300;
      // Đặt tooltip nổi ở bên TRÁI của badge (từ phải qua trái, không bị tràn màn hình bên phải)
      let left = rect.left - tooltipWidth - 12;
      if (left < 10) {
        // Dự phòng nếu mép trái màn hình không đủ chỗ
        left = Math.min(rect.right + 10, window.innerWidth - tooltipWidth - 10);
      }
      const top = Math.max(10, Math.min(rect.top - 15, window.innerHeight - 240));
      setCoords({ top, left });
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      <div
        ref={badgeRef}
        onClick={(e) => {
          e.stopPropagation();
          onCopy(meta.name);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group relative cursor-pointer select-none transition-all duration-150 ${
          isGrid
            ? 'flex items-center justify-between px-2 py-1 rounded border border-[#e2e8f0] dark:border-[#1e293b] hover:border-[#1677ff] dark:hover:border-[#38bdf8] bg-white dark:bg-[#0f172a] hover:bg-blue-50/70 dark:hover:bg-blue-950/40 shadow-2xs hover:shadow-xs'
            : 'flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-blue-50/70 dark:hover:bg-blue-950/40 border border-transparent hover:border-blue-200 dark:hover:border-blue-900'
        }`}
      >
        <div className="flex items-center space-x-1 font-mono text-[11px] truncate">
          <span className="text-[#1677ff] dark:text-[#38bdf8] font-bold">$</span>
          <span className="text-[#1e293b] dark:text-[#f1f5f9] group-hover:text-[#1677ff] dark:group-hover:text-[#38bdf8] font-semibold truncate">
            {cleanName}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0 ml-1">
          {isCopied ? (
            <span className="inline-flex items-center space-x-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.2 rounded animate-pulse">
              <Check className="w-2.5 h-2.5" />
              <span>Đã copy</span>
            </span>
          ) : (
            <>
              {!isGrid && (
                <span className={`text-[9px] px-1 py-0.2 rounded font-medium ${badgeColor}`}>
                  {meta.label}
                </span>
              )}
              <Copy className="w-3 h-3 text-[#94a3b8] group-hover:text-[#1677ff] opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </div>
      </div>

      {/* Floating Tooltip Portal (không bị che bởi scroll sidebar) */}
      {isHovered &&
        coords &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 999999,
            }}
            className="w-72 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-md border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg shadow-xl p-3 text-xs pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
          >
            {/* Header: Variable Name & Badge */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#e2e8f0] dark:border-[#1e293b]">
              <div className="flex items-center space-x-1.5 font-mono text-sm font-bold text-[#1677ff] dark:text-[#38bdf8]">
                <span>{meta.name}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#eff6ff] dark:bg-[#1e293b] text-[#2563eb] dark:text-[#60a5fa] border border-[#bfdbfe] dark:border-[#1e3a8a]">
                {meta.source}
              </span>
            </div>

            {/* Description */}
            <div className="text-[11px] text-[#334155] dark:text-[#cbd5e1] mb-2 leading-relaxed">
              {meta.description}
            </div>

            {/* Example Value */}
            <div className="bg-[#f8fafc] dark:bg-[#020617] border border-[#e2e8f0] dark:border-[#1e293b] rounded px-2 py-1 mb-2">
              <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8] block">Giá trị mẫu:</span>
              <code className="text-[11px] font-mono font-semibold text-[#0f172a] dark:text-[#f8fafc] select-all break-all">
                {meta.example}
              </code>
            </div>

            {/* Usage Guide */}
            <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] space-y-1">
              <div className="flex items-start space-x-1">
                <span className="text-amber-500 font-bold shrink-0">💡</span>
                <span>{meta.usageGuide}</span>
              </div>
              <div className="flex items-start space-x-1 text-emerald-600 dark:text-emerald-400">
                <span className="shrink-0">👆</span>
                <span className="font-medium">Nhấp chuột để sao chép vào bộ nhớ tạm</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default VariableBadge;
