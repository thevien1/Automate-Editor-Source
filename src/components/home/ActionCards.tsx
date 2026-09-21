import React from 'react';
import { Plus, Folder, Settings } from '../common/Icons';

interface ActionCardsProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onSettings: () => void;
}

export const ActionCards: React.FC<ActionCardsProps> = ({
  onNewProject,
  onOpenProject,
  onSettings,
}) => {
  return (
    <div className="flex items-center justify-center space-x-6 my-10 select-none">
      {/* 1. New Project Card (Cyan Highlight Border) */}
      <button
        onClick={onNewProject}
        className="w-36 h-36 rounded-xl border-2 border-[#1677ff] dark:border-[#38bdf8] bg-white dark:bg-[#0d172a] flex flex-col items-center justify-center p-4 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-cyan-500/20 hover:bg-blue-50/50 dark:hover:bg-[#101f38] transition-all duration-200 group active:scale-98 cursor-pointer"
      >
        <div className="w-10 h-10 flex items-center justify-center mb-3">
          <Plus className="w-8 h-8 text-[#1677ff] dark:text-[#38bdf8] stroke-[2.5] group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-xs font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
          New Project
        </span>
      </button>

      {/* 2. Open Project Card */}
      <button
        onClick={onOpenProject}
        className="w-36 h-36 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#0d172a] flex flex-col items-center justify-center p-4 shadow-sm hover:border-[#1677ff] dark:hover:border-[#38bdf8] hover:bg-slate-50 dark:hover:bg-[#101f38] hover:shadow-md transition-all duration-200 group active:scale-98 cursor-pointer"
      >
        <div className="w-10 h-10 flex items-center justify-center mb-3">
          <Folder className="w-7 h-7 text-[#1677ff] dark:text-[#38bdf8] fill-[#1677ff]/10 dark:fill-[#38bdf8]/20 group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9]">
          Open Project
        </span>
      </button>

      {/* 3. Settings Card */}
      <button
        onClick={onSettings}
        className="w-36 h-36 rounded-xl border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#0d172a] flex flex-col items-center justify-center p-4 shadow-sm hover:border-[#1677ff] dark:hover:border-[#38bdf8] hover:bg-slate-50 dark:hover:bg-[#101f38] hover:shadow-md transition-all duration-200 group active:scale-98 cursor-pointer"
      >
        <div className="w-10 h-10 flex items-center justify-center mb-3">
          <Settings className="w-7 h-7 text-[#1677ff] dark:text-[#38bdf8] group-hover:rotate-45 transition-transform duration-300" />
        </div>
        <span className="text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9]">
          Settings
        </span>
      </button>
    </div>
  );
};
