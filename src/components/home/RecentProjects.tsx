import React from 'react';
import { Folder, X } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

export const RecentProjects: React.FC = () => {
  const { recentProjects, openProjectByPath, removeRecentProject, clearRecentProjects } = useProject();

  if (recentProjects.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 select-none text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#e2e8f0] dark:border-[#162236]">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">Recent Project</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748b] dark:text-[#94a3b8] font-mono">
            {recentProjects.length}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            clearRecentProjects();
          }}
          className="text-[11px] text-[#94a3b8] hover:text-red-500 hover:underline transition-colors cursor-pointer"
          title="Xóa toàn bộ lịch sử project gần đây"
        >
          Clear all
        </button>
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {recentProjects.map((project) => (
          <div
            key={project.id || project.path}
            onClick={() => openProjectByPath(project.path, project.name)}
            className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#0d1527] hover:bg-slate-50 dark:hover:bg-[#121c33] border border-[#e2e8f0] dark:border-[#1a263d] hover:border-[#1677ff]/40 dark:hover:border-[#38bdf8]/40 transition-all cursor-pointer group text-left shadow-xs"
          >
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="mt-0.5 shrink-0">
                <Folder className="w-4 h-4 text-[#1677ff] dark:text-[#38bdf8] fill-[#1677ff] dark:fill-[#38bdf8] group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-semibold text-[#1e293b] dark:text-[#f1f5f9] group-hover:text-[#1677ff] dark:group-hover:text-[#38bdf8] transition-colors truncate">
                  {project.name}
                </div>
                <div className="text-[11px] text-[#64748b] truncate font-normal mt-0.5">
                  {project.path}
                </div>
              </div>
            </div>

            {/* Remove button on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeRecentProject(project.path);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#94a3b8] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer ml-2 shrink-0"
              title="Xóa project này khỏi danh sách gần đây"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
