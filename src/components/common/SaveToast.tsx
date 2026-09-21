import React, { useEffect } from 'react';
import { CheckCircle2, X } from './Icons';
import { useProject } from '../../context/ProjectContext';

export const SaveToast: React.FC = () => {
  const { showSaveToast, setShowSaveToast } = useProject();

  useEffect(() => {
    if (!showSaveToast) return;
    const timer = setTimeout(() => {
      setShowSaveToast(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [showSaveToast, setShowSaveToast]);

  if (!showSaveToast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] shadow-2xl rounded-lg px-4 py-2.5 min-w-[210px] select-none transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Green Check Circle matching Image 1 */}
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
      </div>

      {/* Message Text */}
      <div className="flex-1 pr-3">
        <div className="font-semibold text-xs text-[#1e293b] dark:text-white leading-tight">
          Save
        </div>
        <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-tight mt-0.5">
          Save Successful
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => setShowSaveToast(false)}
        className="text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white p-0.5 rounded transition-colors"
        title="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
