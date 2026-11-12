import React from 'react';
import { HomeSidebar } from './HomeSidebar';
import { ActionCards } from './ActionCards';
import { RecentProjects } from './RecentProjects';
import { useProject } from '../../context/ProjectContext';
import { CheckCircle2 } from '../common/Icons';

interface HomeViewProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onSettings: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNewProject,
  onOpenProject,
  onSettings,
}) => {
  const { updateInfo, isCheckingUpdate, setShowUpdateModal } = useProject();
  return (
    <div className="flex-1 flex overflow-hidden bg-[#f8fafc] dark:bg-[#090d18] text-[#1e293b] dark:text-[#f1f5f9] transition-colors duration-200">
      {/* Sidebar */}
      <HomeSidebar onOpenSettings={onSettings} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 overflow-y-auto">
        <div className="w-full max-w-2xl text-center">
          {/* Header Title */}
          <h1 className="text-2xl font-bold text-[#0f172a] dark:text-[#f8fafc] tracking-tight">
            Build, debug, and ship automation flows
          </h1>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-2">
            Visual workflow editor — from idea to product in just a few drag and drops.
          </p>

          {/* Update Available Announcement Banner */}
          {isCheckingUpdate ? (
            <div role="status" className="mt-4 text-xs text-slate-500">Đang kiểm tra cập nhật...</div>
          ) : updateInfo?.error ? (
            <button onClick={() => setShowUpdateModal(true)} className="mt-4 p-3 rounded-xl border border-amber-300 text-xs text-amber-700 dark:text-amber-300">
              Chưa kiểm tra được phiên bản mới. Nhấn để thử lại.
            </button>
          ) : updateInfo?.hasUpdate ? (
            <div
              onClick={() => setShowUpdateModal(true)}
              className="w-full max-w-xl mx-auto mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between shadow-xs cursor-pointer hover:border-amber-400 transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                  🚀
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                    <span>Đã có phiên bản mới: v{updateInfo.latestVersion}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200/70 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200 font-semibold">New</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Phiên bản hiện tại v{updateInfo.currentVersion} • Nhấp để xem và tải về bản cập nhật.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUpdateModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all shrink-0 ml-3"
              >
                Cập nhật ngay
              </button>
            </div>
          ) : updateInfo ? (
            <div
              onClick={() => setShowUpdateModal(true)}
              className="w-full max-w-xl mx-auto mt-4 p-2.5 px-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between shadow-2xs cursor-pointer hover:border-emerald-400 transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold shadow-2xs border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                    <span>Đang sử dụng phiên bản mới nhất: v{updateInfo.currentVersion}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold">Đã cài đặt</span>
                  </div>
                  <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    Không có bản mới tại lần kiểm tra gần nhất.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUpdateModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-500/20 cursor-pointer transition-all shrink-0 ml-3"
              >
                Chi tiết
              </button>
            </div>
          ) : null}

          {/* 3 Action Cards */}
          <ActionCards
            onNewProject={onNewProject}
            onOpenProject={onOpenProject}
            onSettings={onSettings}
          />

          {/* Recent Projects Section */}
          <RecentProjects />
        </div>
      </div>
    </div>
  );
};
