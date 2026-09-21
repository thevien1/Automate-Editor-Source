import React from 'react';
import { X, Sparkles, Download, Globe, CheckCircle2 } from '../common/Icons';
import { UpdateInfo, openExternalUrl } from '../../services/updateService';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, updateInfo }) => {
  if (!isOpen || !updateInfo) return null;

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 select-none p-4 text-left animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#cbd5e1] dark:border-[#1e293b] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Top Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#e2e8f0] dark:border-[#1a2538] bg-[#f8fafc] dark:bg-[#080d19] text-xs text-[#64748b] dark:text-[#94a3b8]">
          <div className="flex items-center space-x-2 font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-[10px]">
              🚀
            </div>
            <span>Cập nhật ứng dụng / Software Update</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94a3b8] hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="p-5 pb-4 border-b border-[#e2e8f0] dark:border-[#1e293b] flex items-center space-x-3.5 bg-white dark:bg-[#0c1220]">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1e293b] dark:text-[#f8fafc] flex items-center space-x-2">
              <span>Đã có phiên bản mới!</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                v{updateInfo.latestVersion}
              </span>
            </h2>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
              Phiên bản mới nhất đã được phát hành trên GitHub.
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* Version Comparison Card */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f8fafc] dark:bg-[#0a0f1d] border border-[#e2e8f0] dark:border-[#1e293b]">
            <div className="text-left">
              <div className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">Phiên bản hiện tại</div>
              <div className="text-sm font-semibold font-mono text-[#334155] dark:text-[#cbd5e1] mt-0.5">
                v{updateInfo.currentVersion}
              </div>
            </div>

            <div className="flex items-center px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-bold">
              ➔
            </div>

            <div className="text-right">
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Phiên bản mới nhất</div>
              <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                v{updateInfo.latestVersion}
              </div>
            </div>
          </div>

          {/* Release Title & Date */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
              {updateInfo.releaseName || `Bản phát hành v${updateInfo.latestVersion}`}
            </div>
            {updateInfo.publishedAt && (
              <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                Thời gian phát hành: {formatDate(updateInfo.publishedAt)}
              </div>
            )}
          </div>

          {/* Release Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1.5">
              Nội dung cập nhật / Changelog:
            </label>
            <div className="p-3 rounded-lg bg-[#f1f5f9] dark:bg-[#080d19] border border-[#e2e8f0] dark:border-[#1a2538] text-xs text-[#334155] dark:text-[#cbd5e1] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
              {updateInfo.releaseNotes?.trim() || '• Cải tiến hiệu năng và giao diện người dùng.\n• Sửa các lỗi và tối ưu hóa hệ thống.'}
            </div>
          </div>

          {/* Download Buttons Section */}
          <div className="space-y-2 pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b]">
            {/* Setup Download Button */}
            {updateInfo.setupDownloadUrl && (
              <button
                type="button"
                onClick={() => openExternalUrl(updateInfo.setupDownloadUrl!)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1677ff] hover:bg-[#4096ff] text-white font-medium text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
              >
                <Download className="w-4 h-4" />
                <span className="font-semibold">Tải bản Cài đặt (Setup .exe) - Khuyến nghị</span>
              </button>
            )}

            {/* Portable Download Button */}
            {updateInfo.portableDownloadUrl && (
              <button
                type="button"
                onClick={() => openExternalUrl(updateInfo.portableDownloadUrl!)}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1e293b] dark:text-[#f1f5f9] font-medium text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer border border-[#cbd5e1] dark:border-[#334155]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải bản Portable (.exe)</span>
              </button>
            )}

            {/* View on GitHub Button */}
            <button
              type="button"
              onClick={() => openExternalUrl(updateInfo.htmlUrl)}
              className="w-full py-1.5 px-4 rounded-xl text-[#64748b] hover:text-[#1e293b] dark:text-[#94a3b8] dark:hover:text-white text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Xem trang phát hành trên GitHub</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#080d19] flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tải trực tiếp từ GitHub an toàn</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#64748b] hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-[#94a3b8] transition-colors cursor-pointer"
          >
            Để sau (Đóng)
          </button>
        </div>

      </div>
    </div>
  );
};
