import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from '../common/Icons';

export interface ConfirmModalOptions {
  title: string;
  subtitle?: string;
  message?: React.ReactNode | string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
  itemName?: string;
  itemType?: string;
  warningNote?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ConfirmModalOptions | null;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  options,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (options?.onConfirm) {
          options.onConfirm();
        }
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, options]);

  if (!isOpen || !options) return null;

  const {
    title,
    subtitle,
    message,
    confirmText = 'Delete',
    cancelText = 'Hủy',
    variant = 'danger',
    itemName,
    itemType,
    warningNote,
    onConfirm,
  } = options;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-white dark:bg-[#0c1424] border border-[#e2e8f0] dark:border-[#1e293b] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] max-w-[460px] w-full overflow-hidden text-left animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient glow */}
        <div
          className={`absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 blur-3xl pointer-events-none rounded-full ${
            isDanger ? 'bg-red-500/15 dark:bg-red-500/25' : 'bg-amber-500/15 dark:bg-amber-500/25'
          }`}
        />

        {/* Modal Header */}
        <div className="relative flex items-start justify-between px-6 pt-6 pb-2">
          <div className="flex items-center space-x-3.5">
            {/* Danger / Warning Icon Box */}
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-4 transition-transform ${
                isDanger
                  ? 'bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400 ring-red-500/10'
                  : 'bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-500 dark:text-amber-400 ring-amber-500/10'
              }`}
            >
              {options.icon ? (
                options.icon
              ) : isDanger ? (
                <Trash2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162236] transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative px-6 py-3 space-y-3">
          {/* Main message */}
          {message && (
            <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {message}
            </div>
          )}

          {/* Target item card (if specified) */}
          {itemName && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070b16] border border-slate-200/80 dark:border-[#162236] flex items-center justify-between">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {itemName}
                </span>
              </div>
              {itemType && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-200/70 dark:bg-[#162236] text-slate-600 dark:text-slate-400 shrink-0">
                  {itemType}
                </span>
              )}
            </div>
          )}

          {/* Warning callout */}
          <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/40 text-amber-800 dark:text-amber-300/90 text-[11px] leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <div>
              {warningNote || 'Thao tác này sẽ xóa vĩnh viễn và không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?'}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="relative px-6 py-4 bg-slate-50/60 dark:bg-[#080d19]/60 border-t border-slate-100 dark:border-[#162236] flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#0f172a] hover:bg-slate-100 dark:hover:bg-[#162236] border border-slate-200 dark:border-[#1e293b] rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer shadow-md active:scale-95 ${
              isDanger
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/25 hover:shadow-red-500/40'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25 hover:shadow-amber-500/40'
            }`}
          >
            {isDanger && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
