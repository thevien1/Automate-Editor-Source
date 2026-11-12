import React, { useEffect, useState } from 'react';
import { X, Sparkles, CheckCircle2, RefreshCw } from '../common/Icons';
import { UpdateInfo, CURRENT_APP_VERSION } from '../../services/updateService';
import { useProject } from '../../context/ProjectContext';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, updateInfo }) => {
  const { checkAppUpdate } = useProject();
  const [nativeUpdate, setNativeUpdate] = useState<any>(null);
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onUpdateState) return;
    let active = true;
    const unsubscribe = api.onUpdateState((state: any) => { if (active) setNativeUpdate(state); });
    api.getUpdateState().then((state: any) => { if (active) setNativeUpdate(state); }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Fallback info if updateInfo is null
  const currentVersion = updateInfo?.currentVersion || CURRENT_APP_VERSION;
  const latestVersion = nativeUpdate?.version && ['downloading', 'downloaded', 'installing'].includes(nativeUpdate.status) ? nativeUpdate.version : updateInfo?.latestVersion || currentVersion;
  const hasUpdate = Boolean(updateInfo?.hasUpdate) || ['downloading', 'downloaded', 'installing'].includes(nativeUpdate?.status);
  const verified = Boolean(updateInfo) && !updateInfo?.error && !nativeUpdate?.error && nativeUpdate?.supported !== false;

  const handleRefreshCheck = async () => {
    setIsRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await checkAppUpdate(false);
      if (res) {
        if (res.error) {
          setRefreshMsg(`Không thể kiểm tra cập nhật: ${res.error}`);
        } else if (res.hasUpdate) {
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
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#cbd5e1] dark:border-[#1e293b] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Top Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e2e8f0] dark:border-[#1a2538] bg-[#f8fafc] dark:bg-[#080d19] text-xs text-[#64748b] dark:text-[#94a3b8]">
          <div className="flex items-center space-x-2 font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
            <div className={`w-4 h-4 rounded text-white flex items-center justify-center font-bold text-[10px] ${
              hasUpdate ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-emerald-600'
            }`}>
              {hasUpdate ? '🚀' : '✓'}
            </div>
            <span>Cập nhật phần mềm</span>
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
                  Bản cập nhật được tải tự động.
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
                  <span>{verified ? 'Đang dùng bản mới nhất' : 'Thông tin phiên bản'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    v{currentVersion}
                  </span>
                </h2>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  {verified ? 'Không có bản mới tại lần kiểm tra gần nhất.' : 'Nhấn kiểm tra cập nhật để thử lại.'}
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
                <div className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">Đang dùng</div>
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
                {hasUpdate ? '➔' : verified ? '✓ Mới nhất' : 'Chưa xác minh'}
              </div>

              <div className="text-right">
                <div className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">Bản mới nhất</div>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {verified || hasUpdate ? `v${latestVersion}` : '—'}
                </div>
              </div>
            </div>

          </div>

          {/* Action / Download Buttons Section */}
          <div className="space-y-2 pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b]">
            {nativeUpdate?.status === 'downloading' && (
              <div className="space-y-2 text-xs" role="status">
                <div>Đang tải bản cập nhật: {Math.round(nativeUpdate.percent || 0)}%</div>
                <progress className="w-full" max={100} value={nativeUpdate.percent || 0} />
                <div>Bạn có thể đóng bảng này và tiếp tục làm việc.</div>
              </div>
            )}
            {nativeUpdate?.status === 'downloaded' && (
              <button className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs"
                onClick={() => (window as any).electronAPI.installUpdate().catch((error: Error) => setRefreshMsg(error.message))}>
                Cập nhật ngay
              </button>
            )}
            {nativeUpdate?.status === 'installing' && (
              <div role="status" className="text-center text-xs">Đang cài đặt và khởi động lại...</div>
            )}
            {(updateInfo?.error || nativeUpdate?.error) && (
              <div role="alert" className="text-xs text-red-500">Không thể cập nhật: {nativeUpdate?.error || updateInfo?.error}</div>
            )}
            {nativeUpdate && !nativeUpdate.supported && (
              <div className="text-xs text-amber-600">Tự cập nhật hỗ trợ bản Windows Setup và ứng dụng macOS đã ký. Bản portable và chế độ phát triển cần cài bản mới thủ công.</div>
            )}
            <button type="button" disabled={isRefreshing || ['checking', 'downloading', 'installing'].includes(nativeUpdate?.status)}
              onClick={handleRefreshCheck} className="w-full py-2 rounded-xl border text-xs disabled:opacity-50">
              <RefreshCw className="inline w-3.5 h-3.5 mr-2" />
              {isRefreshing ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật / Thử lại'}
            </button>

            {refreshMsg && (
              <div className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 py-1">
                {refreshMsg}
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#080d19] flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{verified ? 'GitHub Releases' : 'Chưa xác minh phiên bản mới'}</span>
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
