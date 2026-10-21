import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Check, Key, Play, Box, Sparkles, CheckCircle2 } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';
import runtimeLogoImg from '../../assets/runtime_logo.png';

interface BuildPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BuildPackageModal: React.FC<BuildPackageModalProps> = ({ isOpen, onClose }) => {
  const { currentProject, setScreen, openProjectByPath, showToast } = useProject();

  // 1. Tự động hiển thị mẫu tên kèm " SV Browser" ở cuối
  const [appName, setAppName] = useState(() => {
    const raw = currentProject?.info.name || 'Application';
    if (!raw.toLowerCase().endsWith('sv browser')) {
      return `${raw} SV Browser`;
    }
    return raw;
  });

  const [appVersion, setAppVersion] = useState(() => currentProject?.info.version || '1.0.0');
  const [authorInfo, setAuthorInfo] = useState(() => currentProject?.info.author_info || 'SV Browser - svbrowser.com');
  const [note, setNote] = useState(() => currentProject?.info.description || '');
  const [password, setPassword] = useState('');
  const [useEncryption, setUseEncryption] = useState(true);
  const [exportPath, setExportPath] = useState(() => {
    if (currentProject?.folderPath) {
      return `${currentProject.folderPath}\\build`;
    }
    return '';
  });

  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [buildResult, setBuildResult] = useState<{
    success: boolean;
    packagePath?: string;
    launcherPath?: string;
    targetDir?: string;
    error?: string;
  } | null>(null);

  // Cập nhật lại tên mẫu khi mở modal
  useEffect(() => {
    if (isOpen && currentProject?.info.name) {
      const raw = currentProject.info.name;
      if (!raw.toLowerCase().endsWith('sv browser')) {
        setAppName(`${raw} SV Browser`);
      } else {
        setAppName(raw);
      }
      setAuthorInfo(currentProject.info.author_info || 'SV Browser - svbrowser.com');
      setNote(currentProject.info.description || '');
      setAppVersion(currentProject.info.version || '1.0.0');
      setBuildResult(null);
      setIsBuilding(false);
      setBuildProgress(0);
      setProgressStatus('');
      if (currentProject.folderPath) {
        setExportPath(`${currentProject.folderPath}\\build`);
      }
    }
  }, [isOpen, currentProject?.info.name, currentProject?.folderPath]);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    if ((window as any).electronAPI?.openFolderDialog) {
      try {
        const folder = await (window as any).electronAPI.openFolderDialog();
        if (folder) setExportPath(folder);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBuild = async () => {
    if (!currentProject?.folderPath) return;
    setIsBuilding(true);
    setBuildProgress(5);
    setProgressStatus('Khởi tạo quy trình đóng gói...');
    setBuildResult(null);

    // Tiến trình phần trăm mượt mà
    const t1 = setTimeout(() => {
      setBuildProgress(25);
      setProgressStatus('Quét kịch bản chính và toàn bộ sub-workflows...');
    }, 300);

    const t2 = setTimeout(() => {
      setBuildProgress(55);
      setProgressStatus('Đang mã hóa dữ liệu & loại bỏ mã nguồn thô (.gscript)...');
    }, 700);

    const t3 = setTimeout(() => {
      setBuildProgress(80);
      setProgressStatus('Đang đóng gói file .svblaunch và tạo trình khởi chạy Runtime...');
    }, 1100);

    try {
      if ((window as any).electronAPI?.buildPackage) {
        const res = await (window as any).electronAPI.buildPackage({
          folderPath: currentProject.folderPath,
          exportPath: exportPath || undefined,
          packageName: appName.trim(),
          version: appVersion.trim(),
          author: authorInfo.trim(),
          note: note.trim(),
          password: password.trim() || undefined,
          useLicense: false,
        });

        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);

        if (res.success) {
          setBuildProgress(100);
          setProgressStatus('Đóng gói hoàn tất 100%!');
          setBuildResult(res);

          // Sau khi chạy xong 100%: hiển thị ngắn và tự động trở lại bảng code bình thường (Ảnh 3)
          setTimeout(() => {
            onClose();
            showToast(
              'Build Package hoàn tất',
              `Đã đóng gói ${appName} thành công. Toàn bộ mã nguồn đã được bảo mật.`
            );
          }, 1400);
        } else {
          setBuildProgress(0);
          setProgressStatus('');
          setBuildResult(res);
        }
      } else {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        setBuildProgress(0);
        setProgressStatus('');
        setBuildResult({
          success: false,
          error: 'Chức năng build package chỉ khả dụng trong môi trường Electron desktop.',
        });
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setBuildProgress(0);
      setProgressStatus('');
      setBuildResult({
        success: false,
        error: err.message || 'Lỗi không xác định khi build package',
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const handleRunRuntimeNow = () => {
    if (buildResult?.packagePath) {
      onClose();
      openProjectByPath(buildResult.packagePath, appName);
      setScreen('runtime');
    }
  };

  const handleOpenFolder = () => {
    if (buildResult?.packagePath && (window as any).electronAPI?.showInFolder) {
      (window as any).electronAPI.showInFolder(buildResult.packagePath);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none text-left">
      <div className="bg-white dark:bg-[#0c1220] border border-[#cbd5e1] dark:border-[#1e293b] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e2e8f0] dark:border-[#1a2538] bg-[#f8fafc] dark:bg-[#080d19]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm flex items-center justify-center bg-blue-50 dark:bg-blue-950/40">
              <img src={runtimeLogoImg} alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#1e293b] dark:text-[#f1f5f9]">
                Build .svblaunch (Package)
              </div>
              <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                Đóng gói ứng dụng gửi người khác — Tự mã hoá và ẩn toàn bộ mã nguồn (.gscript)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#64748b] hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Thanh Tiến Trình % Khi Đang Chạy Hoặc Vừa Xong */}
          {buildProgress > 0 && (
            <div className="space-y-2 p-3.5 rounded-xl bg-blue-50 dark:bg-[#081226] border border-blue-200 dark:border-blue-900/60 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center space-x-1.5">
                  {buildProgress === 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping inline-block" />
                  )}
                  <span>{progressStatus}</span>
                </span>
                <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{buildProgress}%</span>
              </div>

              <div className="w-full h-2.5 bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${buildProgress}%` }}
                />
              </div>

              {buildProgress === 100 && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 flex items-center justify-between">
                  <span>✅ Đã hoàn tất! Đang trở lại giao diện xem code bình thường...</span>
                </div>
              )}
            </div>
          )}

          {buildResult?.success ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start space-x-3 text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">Đóng gói hoàn tất thành công!</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Đã tạo file thực thi (.exe) có icon sấm sét 3D riêng biệt. File .svblaunch và các mã nguồn thô đã được ẩn an toàn, người nhận chỉ cần mở file .exe là bảng Runtime tự động kích hoạt.
                  </div>
                </div>
              </div>

              <div className="bg-[#fafbfc] dark:bg-[#080d19] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
                {buildResult.launcherPath && (
                  <div>
                    <span className="text-[#64748b] dark:text-[#94a3b8]">File chạy (Launcher EXE): </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold select-all break-all">
                      {buildResult.launcherPath}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[#64748b] dark:text-[#94a3b8]">File Package (.svblaunch đã ẩn): </span>
                  <span className="text-[#1e293b] dark:text-[#38bdf8] font-bold select-all break-all">
                    {buildResult.packagePath}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b]">
                <button
                  onClick={handleOpenFolder}
                  className="px-4 py-2 rounded-lg border border-[#cbd5e1] dark:border-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-[#334155] dark:text-[#cbd5e1] flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span>Mở thư mục build</span>
                </button>
                <button
                  onClick={handleRunRuntimeNow}
                  className="px-5 py-2 rounded-lg bg-[#1677ff] hover:bg-blue-600 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Chạy bảng Runtime ngay (Ảnh 2)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {buildResult?.error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs">
                  {buildResult.error}
                </div>
              )}

              {/* Package Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#1e293b] dark:text-[#f1f5f9] flex items-center justify-between">
                    <span>Tên ứng dụng khi build</span>
                    <span className="text-[10px] text-blue-500 font-normal">Mẫu: kèm "SV Browser"</span>
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#080d19] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff]"
                    placeholder="fb automaster SV Browser"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#1e293b] dark:text-[#f1f5f9]">Phiên bản (Version)</label>
                  <input
                    type="text"
                    value={appVersion}
                    onChange={(e) => setAppVersion(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#080d19] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff]"
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#1e293b] dark:text-[#f1f5f9]">Tác giả (Author Info)</label>
                <input
                  type="text"
                  value={authorInfo}
                  onChange={(e) => setAuthorInfo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#080d19] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff]"
                  placeholder="SV Browser - svbrowser.com"
                />
              </div>

              {/* Note / Description */}
              <div className="space-y-1">
                <label className="font-semibold text-[#1e293b] dark:text-[#f1f5f9] flex items-center justify-between">
                  <span>Ghi chú / Mô tả (Note)</span>
                  <span className="text-[10px] text-blue-500 font-normal">Hiển thị khi mở chạy</span>
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#080d19] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] resize-none"
                  placeholder="Nhập ghi chú hoặc hướng dẫn sử dụng kịch bản khi mở chạy..."
                />
              </div>

              {/* Export Folder */}
              <div className="space-y-1">
                <label className="font-semibold text-[#1e293b] dark:text-[#f1f5f9] flex items-center justify-between">
                  <span>Thư mục xuất file gửi cho người khác</span>
                  <span className="text-[10px] text-amber-500 font-normal">Chỉ gồm file đóng gói mã hoá</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={exportPath}
                    onChange={(e) => setExportPath(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#080d19] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-[#1e293b] dark:text-[#f1f5f9] font-mono focus:outline-none focus:border-[#1677ff]"
                  />
                  <button
                    onClick={handleSelectFolder}
                    className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#475569] dark:text-[#cbd5e1] font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Chọn...</span>
                  </button>
                </div>
              </div>

              {/* Password protection */}
              <div className="space-y-1">
                <label className="font-semibold text-[#1e293b] dark:text-[#f1f5f9] flex items-center justify-between">
                  <span>Mật khẩu bảo vệ (Tùy chọn)</span>
                  <span className="text-[10px] text-[#94a3b8] font-normal">Để trống nếu không đặt mật khẩu</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#080d19] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff]"
                  placeholder="Nhập mật khẩu chạy kịch bản nếu có..."
                />
              </div>

              {/* Options */}
              <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b] space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useEncryption}
                    onChange={(e) => setUseEncryption(e.target.checked)}
                    className="rounded text-[#1677ff] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-[#334155] dark:text-[#cbd5e1] font-medium">
                    🔒 Mã hóa toàn bộ kịch bản & tự động ẩn file .svblaunch
                  </span>
                </label>
                <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] pl-5 leading-relaxed">
                  Thư mục xuất bản sẽ <strong className="text-[#1e293b] dark:text-white">hoàn toàn không có các file .gscript thô và file .svblaunch được ẩn</strong>. Người nhận chỉ cần chạy file <span className="font-mono text-emerald-600 dark:text-emerald-400">{appName}.exe</span> có biểu tượng sấm sét 3D để mở thẳng bảng Runtime mà không thấy mã nguồn.
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#e2e8f0] dark:border-[#1e293b]">
                <button
                  onClick={onClose}
                  disabled={isBuilding}
                  className="px-4 py-2 rounded-lg border border-[#cbd5e1] dark:border-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#475569] dark:text-[#cbd5e1] font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBuild}
                  disabled={isBuilding || !appName.trim()}
                  className={`px-5 py-2 rounded-lg bg-[#1677ff] hover:bg-blue-600 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-blue-500/20 transition-all ${
                    isBuilding || !appName.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'
                  }`}
                >
                  <Box className="w-4 h-4" />
                  <span>{isBuilding ? 'Đang đóng gói...' : 'Bắt đầu Build & Đóng gói'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
