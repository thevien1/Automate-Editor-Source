import React from 'react';
import { Folder, Plus } from '../common/Icons';

export const WorkflowTabs: React.FC = () => {
  return (
    <div className="h-8 bg-white dark:bg-[#0a0f1d] border-b border-[#e2e8f0] dark:border-[#162236] flex items-center justify-between px-3 select-none transition-colors">
      <div className="flex items-center space-x-1">
        {/* Active Main Workflow Tab */}
        <div className="flex items-center space-x-2 bg-[#e6f4ff] dark:bg-[#0e1e3b] text-[#1677ff] dark:text-[#38bdf8] px-3 py-1 rounded text-xs font-medium border border-[#91caff] dark:border-[#1d4ed8]/50 shadow-xs">
          <Folder className="w-3.5 h-3.5 fill-[#1677ff] dark:fill-[#38bdf8]" />
          <span>Main workflow</span>
        </div>
      </div>

      {/* Add Tab Button */}
      <button
        onClick={() => alert('Add workflow tab')}
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] transition-colors"
        title="New Workflow Tab"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
