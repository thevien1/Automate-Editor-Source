import React from 'react';
import { Play, FlaskConical, Save, Undo2, Redo2, Search, Trash2, Circle, Wand2, Globe, Code2, Sparkles } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

export const ToolBar: React.FC = () => {
  const {
    currentProject,
    saveProject,
    selectedBlockKey,
    setShowTestModal,
    setShowRuntimeModal,
    setShowAiModal,
    undo,
    redo,
    canUndo,
    canRedo,
    clearWorkflow,
    setShowJsonModal,
    setJsonModalMode,
  } = useProject();

  const handleRun = async () => {
    if (currentProject) {
      await saveProject(); // Tự động lưu code trước khi chạy
    }
    setShowRuntimeModal(true);
  };

  const handleTest = async () => {
    if (currentProject) {
      await saveProject(); // Tự động lưu code trước khi test
    }
    setShowTestModal(true);
  };

  const blockDisplayName = {
    before_init: 'Before browser opened',
    main_logic: 'Main logic',
    after_quit: 'After browser closed',
  }[selectedBlockKey];

  return (
    <div className="h-10 bg-white dark:bg-[#0a0f1d] border-b border-[#e2e8f0] dark:border-[#162236] flex items-center justify-between px-3 select-none text-xs text-left transition-colors">
      {/* Left Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Run */}
        <button
          onClick={handleRun}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-[#10b981] hover:bg-[#10b981]/15 font-semibold transition-colors cursor-pointer active:scale-95"
          title="Run automation on Chrome"
        >
          <Play className="w-3.5 h-3.5 fill-[#10b981]" />
          <span>Run</span>
        </button>

        {/* Test */}
        <button
          onClick={handleTest}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-[#a855f7] hover:bg-[#a855f7]/15 font-semibold transition-colors cursor-pointer active:scale-95"
          title="Test current logic"
        >
          <FlaskConical className="w-3.5 h-3.5 text-[#a855f7]" />
          <span>Test</span>
        </button>

        {/* Save */}
        <button
          onClick={() => saveProject()}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-[#1677ff] dark:text-[#38bdf8] hover:bg-[#1677ff]/10 dark:hover:bg-[#38bdf8]/15 font-semibold transition-colors cursor-pointer active:scale-95"
          title="Save project (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        <div className="h-4 w-[1px] bg-[#e2e8f0] dark:bg-[#1e293b] mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-1.5 rounded transition-colors ${
            canUndo
              ? 'hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#334155] dark:text-[#cbd5e1] hover:text-black dark:hover:text-white cursor-pointer active:scale-95'
              : 'text-[#94a3b8] dark:text-[#475569] opacity-40 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-1.5 rounded transition-colors ${
            canRedo
              ? 'hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#334155] dark:text-[#cbd5e1] hover:text-black dark:hover:text-white cursor-pointer active:scale-95'
              : 'text-[#94a3b8] dark:text-[#475569] opacity-40 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-[#e2e8f0] dark:bg-[#1e293b] mx-1" />

        {/* JSON Code Button */}
        <button
          onClick={() => {
            setJsonModalMode('export');
            setShowJsonModal(true);
          }}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-[#6366f1] hover:bg-[#6366f1]/15 font-semibold transition-colors cursor-pointer active:scale-95"
          title="JSON Code Transfer (Sao chép / Dán JSON trực tiếp)"
        >
          <Code2 className="w-3.5 h-3.5 text-[#6366f1]" />
          <span>JSON</span>
        </button>

        <div className="h-4 w-[1px] bg-[#e2e8f0] dark:bg-[#1e293b] mx-1" />

        {/* Search */}
        <button
          onClick={() => {
            const el = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            el?.focus();
            el?.select();
          }}
          className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] hover:text-black dark:hover:text-white cursor-pointer"
          title="Search (Ctrl+F)"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </button>

        {/* Clear All */}
        <button
          onClick={clearWorkflow}
          className="flex items-center space-x-1 px-2 py-1 rounded text-[#ef4444] hover:bg-[#ef4444]/15 transition-colors cursor-pointer"
          title="Clear all nodes in current block"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>

        <div className="h-4 w-[1px] bg-[#e2e8f0] dark:bg-[#1e293b] mx-1" />

        {/* Record action */}
        <button className="flex items-center space-x-1 px-2 py-1 rounded text-[#f43f5e] hover:bg-[#f43f5e]/15 transition-colors">
          <Circle className="w-3 h-3 fill-[#f43f5e] text-[#f43f5e]" />
          <span>Record action</span>
        </button>

        {/* AI Copilot */}
        <button
          onClick={() => setShowAiModal(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[#9333ea] dark:text-[#c084fc] hover:bg-[#9333ea]/15 active:scale-95 font-semibold transition-all cursor-pointer shadow-sm border border-[#9333ea]/20 dark:border-[#c084fc]/25 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 dark:from-purple-500/15 dark:to-indigo-500/15 hover:border-[#9333ea]/40"
          title="AI Workflow Copilot (Hỗ trợ tạo kịch bản tự động hóa bằng AI & MCP Skill Server)"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#9333ea] dark:text-[#c084fc] animate-pulse" />
          <span>AI Copilot</span>
        </button>
      </div>

      {/* Right Breadcrumbs */}
      <div className="flex items-center space-x-1.5 text-xs text-[#64748b]">
        <Globe className="w-3.5 h-3.5 text-[#1677ff] dark:text-[#38bdf8]" />
        <span className="hover:text-[#1677ff] dark:hover:text-[#38bdf8] cursor-pointer">Browser</span>
        <span>&gt;</span>
        <span className="hover:text-[#1677ff] dark:hover:text-[#38bdf8] cursor-pointer">{blockDisplayName}</span>
        <span>&gt;</span>
        <span className="text-slate-800 dark:text-[#f1f5f9] font-medium">{currentProject?.info.name || 'Untitled'}</span>
      </div>
    </div>
  );
};
