import React from 'react';
import { Minus, Square, X, CheckCircle2 } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';
import { AppLogo } from '../common/AppLogo';
import packageInfo from '../../../package.json';

interface TitleBarProps {
  projectName?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ projectName }) => {
  const { screen, updateInfo, setShowUpdateModal } = useProject();
  const currentVersion = packageInfo.version || '3.1.0';

  const handleMinimize = () => {
    if ((window as any).electronAPI?.minimize) {
      (window as any).electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if ((window as any).electronAPI?.maximize) {
      (window as any).electronAPI.maximize();
    }
  };

  const handleClose = () => {
    if ((window as any).electronAPI?.close) {
      (window as any).electronAPI.close();
    }
  };

  return (
    <div className="h-8 bg-white dark:bg-[#070b16] border-b border-[#e2e8f0] dark:border-[#162236] flex items-center justify-between px-2 select-none text-xs text-[#64748b] dark:text-[#94a3b8] z-50 transition-colors">
      <div className="flex items-center space-x-2">
        <AppLogo size={18} />
        <span className="font-medium text-[#1e293b] dark:text-[#cbd5e1]">
          SV Browser Automate Editor v{currentVersion}-stable {screen === 'editor' && projectName ? `- ${projectName}` : ''}
        </span>

        {updateInfo?.hasUpdate ? (
          <button
            onClick={() => setShowUpdateModal(true)}
            className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-[11px] shadow-sm animate-pulse cursor-pointer transition-all ml-1.5"
            title={`Đã có phiên bản mới v${updateInfo.latestVersion}! Bấm để cập nhật`}
          >
            <span>🚀 Update v{updateInfo.latestVersion}</span>
          </button>
        ) : updateInfo ? (
          <button
            onClick={() => setShowUpdateModal(true)}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] border border-emerald-300 dark:border-emerald-700/60 cursor-pointer transition-all ml-1.5 shadow-2xs"
            title="Đã cài đặt đúng phiên bản mới nhất! Bấm để xem chứng nhận & chi tiết"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Đã cài mới nhất</span>
          </button>
        ) : null}
      </div>

      {/* Window Controls */}
      <div className="flex items-center">
        <button
          onClick={handleMinimize}
          className="w-9 h-7 flex items-center justify-center hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-9 h-7 flex items-center justify-center hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white transition-colors cursor-pointer"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-9 h-7 flex items-center justify-center hover:bg-[#ef4444] hover:text-white text-[#64748b] dark:text-[#94a3b8] transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
