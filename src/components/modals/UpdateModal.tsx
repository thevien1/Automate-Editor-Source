import React, { useState } from 'react';
import { X, Sparkles, Download, Globe, CheckCircle2, RefreshCw, Shield } from '../common/Icons';
import { UpdateInfo, openExternalUrl, CURRENT_APP_VERSION, GITHUB_REPO } from '../../services/updateService';
import { useProject } from '../../context/ProjectContext';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, updateInfo }) => {
  const { checkAppUpdate } = useProject();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Fallback info if updateInfo is null
  const currentVersion = updateInfo?.currentVersion || CURRENT_APP_VERSION;
  const latestVersion = updateInfo?.latestVersion || currentVersion;
  const hasUpdate = Boolean(updateInfo?.hasUpdate);

  const formatDate = (isoOrMs: string | number) => {
    if (!isoOrMs) return '';
    try {
      const d = new Date(isoOrMs);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(isoOrMs);
    }
  };

  const handleRefreshCheck = async () => {
    setIsRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await checkAppUpdate(false);
      if (res) {
        if (res.hasUpdate) {
          setRefreshMsg(`Đã phát hiện bản mới: v${res.latestVersion}`);
        } else {
          setRefreshMsg(`Đã kiểm tra: Bạn đang dùng phiên bản mới nhất v${res.currentVersion}`);
        }
      }
    } catch {
      setRefreshMsg('Không thể kết nối đến máy chủ GitHub.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 select-none p-4 text-left animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#cbd5e1] dark:border-[#1e293b] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Top Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e2e8f0] dark:border-[#1a2538] bg-[#f8fafc] dark:bg-[#080d19] text-xs text-[#64748b] dark:text-[#94a3b8]">
          <div className="flex items-center space-x-2 font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
            <div className={`w-4 h-4 rounded text-white flex items-center justify-center font-bold text-[10px] ${
              hasUpdate ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-emerald-600'
            }`}>
              {hasUpdate ? '🚀' : '✓'}
            </div>
            <span>Thông tin phiên bản & Cập nhật / Software Version</span>
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
          {hasUpdate ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1e293b] dark:text-[#f8fafc] flex items-center space-x-2">
                  <span>Đã có phiên bản mới!</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                    v{latestVersion}
                  </span>
                </h2>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                  Bản cập nhật mới đã sẵn sàng trên GitHub để bạn tải về.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1e293b] dark:text-[#f8fafc] flex items-center space-x-2">
                  <span>Đã cài đặt bản mới nhất!</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    v{currentVersion} (Latest)
                  </span>
                </h2>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  ✓ Bạn đã cài đúng phiên bản mới nhất và sẵn sàng sử dụng.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[62vh]">
          {/* Status Verification Card */}
          <div className={`p-4 rounded-xl border ${
            hasUpdate 
              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40' 
              : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="text-left">
                <div className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">Phiên bản trên máy của bạn</div>
                <div className="text-sm font-bold font-mono text-[#1e293b] dark:text-[#f1f5f9] mt-0.5 flex items-center space-x-1.5">
                  <span>v{currentVersion}</span>
                  {!hasUpdate && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded-full">
                      Đã cài đặt
                    </span>
                  )}
                </div>
              </div>

              <div className={`flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                hasUpdate 
                  ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200' 
                  : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
              }`}>
                {hasUpdate ? 'Cần cập nhật ➔' : '✓ Khớp 100%'}
              </div>

              <div className="text-right">
                <div className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">Bản mới nhất trên GitHub</div>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  v{latestVersion}
                </div>
              </div>
            </div>

            <div className="pt-2.5 text-xs flex items-center justify-between text-[#64748b] dark:text-[#94a3b8]">
              <div className="flex items-center space-x-1.5">
                <Shield className={`w-3.5 h-3.5 ${hasUpdate ? 'text-amber-500' : 'text-emerald-500'}`} />
                <span className="font-medium">
                  {hasUpdate 
                    ? 'Trạng thái: Máy tính chưa được cài đặt bản mới nhất v' + latestVersion
                    : 'Trạng thái: ✅ Đã cài đặt đúng phiên bản phát hành mới nhất'
                  }
                </span>
              </div>
              {updateInfo?.checkedAt && (
                <span className="text-[10px]">
                  Kiểm tra: {formatDate(updateInfo.checkedAt)}
                </span>
              )}
            </div>
          </div>

          {/* If Update Available: Guide the user */}
          {hasUpdate && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 text-blue-800 dark:text-blue-300">
                <span>📌 Hướng dẫn cài đặt cập nhật:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-700 dark:text-blue-300/90 leading-relaxed">
                <li>Bấm nút <strong>"Tải bản Cài đặt (Setup .exe)"</strong> bên dưới để tải về.</li>
                <li>Sau khi tải xong, chạy file cài đặt để cập nhật đè lên bản cũ (không mất dữ liệu).</li>
                <li>Mở lại phần mềm — hệ thống sẽ tự nhận diện trạng thái <strong>"Đã cài mới nhất"</strong>.</li>
              </ol>
            </div>
          )}

          {/* Release Title & Date */}
          {(updateInfo?.releaseName || updateInfo?.publishedAt) && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
                {updateInfo?.releaseName || `Thông tin bản phát hành v${latestVersion}`}
              </div>
              {updateInfo?.publishedAt && (
                <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  Thời gian phát hành trên GitHub: {formatDate(updateInfo.publishedAt)}
                </div>
              )}
            </div>
          )}

          {/* Release Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1.5">
              {hasUpdate ? 'Nội dung cập nhật mới / Changelog:' : `Tính năng & Thay đổi của phiên bản v${latestVersion}:`}
            </label>
            <div className="p-3 rounded-lg bg-[#f1f5f9] dark:bg-[#080d19] border border-[#e2e8f0] dark:border-[#1a2538] text-xs text-[#334155] dark:text-[#cbd5e1] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
              {updateInfo?.releaseNotes?.trim() || '• Cập nhật các tính năng tự động hóa mới.\n• Nâng cấp giao diện trực quan và trải nghiệm người dùng.\n• Sửa lỗi và tối ưu hóa hiệu năng ứng dụng.'}
            </div>
          </div>

          {/* Action / Download Buttons Section */}
          <div className="space-y-2 pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b]">
            {hasUpdate ? (
              <>
                {/* Setup Download Button */}
                {updateInfo?.setupDownloadUrl ? (
                  <button
                    type="button"
                    onClick={() => openExternalUrl(updateInfo.setupDownloadUrl!)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1677ff] hover:bg-[#4096ff] text-white font-medium text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span className="font-semibold">Tải bản Cài đặt (Setup .exe) - Khuyến nghị</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openExternalUrl(updateInfo?.htmlUrl || `https://github.com/${GITHUB_REPO}/releases`)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1677ff] hover:bg-[#4096ff] text-white font-medium text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span className="font-semibold">Tải bản cập nhật trên GitHub</span>
                  </button>
                )}

                {/* Portable Download Button */}
                {updateInfo?.portableDownloadUrl && (
                  <button
                    type="button"
                    onClick={() => openExternalUrl(updateInfo.portableDownloadUrl!)}
                    className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1e293b] dark:text-[#f1f5f9] font-medium text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer border border-[#cbd5e1] dark:border-[#334155]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải bản Portable (.exe)</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isRefreshing}
                  onClick={handleRefreshCheck}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1e293b] dark:text-[#f1f5f9] font-medium text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer border border-[#cbd5e1] dark:border-[#334155] disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Đang kiểm tra...' : 'Kiểm tra lại từ GitHub'}</span>
                </button>
              </div>
            )}

            {refreshMsg && (
              <div className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 py-1">
                {refreshMsg}
              </div>
            )}

            {/* View on GitHub Button */}
            <button
              type="button"
              onClick={() => openExternalUrl(updateInfo?.htmlUrl || `https://github.com/${GITHUB_REPO}/releases`)}
              className="w-full py-1.5 px-4 rounded-xl text-[#64748b] hover:text-[#1e293b] dark:text-[#94a3b8] dark:hover:text-white text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Xem trang phát hành trên GitHub (github.com/{GITHUB_REPO})</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#080d19] flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Xác thực từ GitHub Releases</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#64748b] hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-[#94a3b8] transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
