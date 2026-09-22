import React, { useState } from 'react';
import { Moon, Sun, Globe, ChevronDown, Settings } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

interface MenuBarProps {
  onNewProject: () => void;
  onOpenProject: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ onNewProject, onOpenProject }) => {
  const {
    closeProject,
    saveProject,
    theme,
    toggleTheme,
    setShowSettingsModal,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelectedNode,
    cutSelectedNode,
    pasteCopiedNode,
    duplicateSelectedNode,
    deleteSelectedNode,
    setShowJsonModal,
    setJsonModalMode,
    setShowUpdateModal,
  } = useProject();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  return (
    <div className="h-7 bg-white dark:bg-[#090d18] border-b border-[#e2e8f0] dark:border-[#162236] flex items-center justify-between px-3 select-none text-xs text-[#334155] dark:text-[#cbd5e1] relative z-40 transition-colors">
      {/* Left Menu Items */}
      <div className="flex items-center space-x-1">
        {/* File Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('file')}
            className={`px-2 py-0.5 rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors ${
              activeMenu === 'file' ? 'bg-[#f1f5f9] dark:bg-[#1e293b] text-black dark:text-white font-medium' : ''
            }`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div
              className="absolute left-0 top-full mt-0.5 w-48 bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] shadow-2xl rounded-md py-1 z-50 text-xs text-[#334155] dark:text-[#cbd5e1]"
              onClick={() => setActiveMenu(null)}
            >
              <button
                onClick={onNewProject}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>New Project</span>
                <span className="text-[10px] text-[#64748b]">Ctrl+N</span>
              </button>
              <button
                onClick={() => {
                  if ((window as any).electronAPI?.newWindow) {
                    (window as any).electronAPI.newWindow();
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>New Window</span>
                <span className="text-[10px] text-[#64748b]">Ctrl+Shift+N</span>
              </button>
              <button
                onClick={onOpenProject}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>Open Project</span>
                <span className="text-[10px] text-[#64748b]">Ctrl+O</span>
              </button>
              <button
                onClick={saveProject}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>Save</span>
                <span className="text-[10px] text-[#64748b]">Ctrl+S</span>
              </button>
              <div className="border-t border-[#e2e8f0] dark:border-[#1e293b] my-1" />
              <button
                onClick={closeProject}
                className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
              >
                Close Project (Back to Home)
              </button>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('edit')}
            className={`px-2 py-0.5 rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors ${
              activeMenu === 'edit' ? 'bg-[#f1f5f9] dark:bg-[#1e293b] text-black dark:text-white font-medium' : ''
            }`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div
              className="absolute left-0 top-full mt-0.5 w-44 bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] shadow-2xl rounded-md py-1 z-50 text-xs text-[#334155] dark:text-[#cbd5e1]"
              onClick={() => setActiveMenu(null)}
            >
              <button
                onClick={undo}
                disabled={!canUndo}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
                  canUndo ? 'hover:bg-[#1e293b] hover:text-[#38bdf8] cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Undo</span>
                <span className="text-[#64748b] text-[10px]">Ctrl+Z</span>
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
                  canRedo ? 'hover:bg-[#1e293b] hover:text-[#38bdf8] cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>Redo</span>
                <span className="text-[#64748b] text-[10px]">Ctrl+Y</span>
              </button>
              <div className="border-t border-[#e2e8f0] dark:border-[#1e293b] my-1" />
              <button
                onClick={cutSelectedNode}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>Cut</span>
                <span className="text-[#64748b] text-[10px]">Ctrl+X</span>
              </button>
              <button
                onClick={copySelectedNode}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>Copy</span>
                <span className="text-[#64748b] text-[10px]">Ctrl+C</span>
              </button>
              <button
                onClick={pasteCopiedNode}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>Paste</span>
                <span className="text-[#64748b] text-[10px]">Ctrl+V</span>
              </button>
              <button
                onClick={duplicateSelectedNode}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>Duplicate</span>
                <span className="text-[#64748b] text-[10px]">Ctrl+D</span>
              </button>
              <div className="border-t border-[#e2e8f0] dark:border-[#1e293b] my-1" />
              <button
                onClick={() => {
                  setJsonModalMode('export');
                  setShowJsonModal(true);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>Copy / Export JSON...</span>
                <span className="text-[#64748b] text-[10px]">Ctrl+Shift+C</span>
              </button>
              <button
                onClick={() => {
                  setJsonModalMode('import');
                  setShowJsonModal(true);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1e293b] hover:text-[#38bdf8] flex items-center justify-between cursor-pointer"
              >
                <span>Paste / Import JSON...</span>
                <span className="text-[#64748b] text-[10px]">Ctrl+Shift+V</span>
              </button>
              <div className="border-t border-[#e2e8f0] dark:border-[#1e293b] my-1" />
              <button
                onClick={deleteSelectedNode}
                className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-between cursor-pointer"
              >
                <span>Delete</span>
                <span className="text-[#64748b] text-[10px]">Del</span>
              </button>
            </div>
          )}
        </div>

        {/* Build Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('build')}
            className={`px-2 py-0.5 rounded hover:bg-[#1e293b] transition-colors ${
              activeMenu === 'build' ? 'bg-[#1e293b] text-white' : ''
            }`}
          >
            Build
          </button>
          {activeMenu === 'build' && (
            <div
              className="absolute left-0 top-full mt-0.5 w-48 bg-[#0f172a] border border-[#1e293b] shadow-2xl rounded-md py-1 z-50 text-xs text-[#cbd5e1]"
              onClick={() => setActiveMenu(null)}
            >
              <div
                onClick={() => alert('Build .gpmlaunch package')}
                className="px-3 py-1.5 hover:bg-[#1e293b] cursor-pointer"
              >
                Build .gpmlaunch (Package)
              </div>
            </div>
          )}
        </div>

        {/* Support Menu */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('support')}
            className={`px-2 py-0.5 rounded hover:bg-[#1e293b] transition-colors ${
              activeMenu === 'support' ? 'bg-[#1e293b] text-white' : ''
            }`}
          >
            Support
          </button>
          {activeMenu === 'support' && (
            <div
              className="absolute left-0 top-full mt-0.5 w-44 bg-[#0f172a] border border-[#1e293b] shadow-2xl rounded-md py-1 z-50 text-xs text-[#cbd5e1]"
              onClick={() => setActiveMenu(null)}
            >
              <a
                href="https://docs.gpmautomate.com"
                target="_blank"
                rel="noreferrer"
                className="block px-3 py-1.5 hover:bg-[#1e293b] text-[#cbd5e1]"
              >
                Documentation
              </a>
              <div
                onClick={() => setShowUpdateModal(true)}
                className="px-3 py-1.5 hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] cursor-pointer"
              >
                About & Phiên bản
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-1 rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          title="Settings (Appearance, Theme Color, AI, License)"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={toggleTheme}
          className="p-1 rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-700" />
          )}
        </button>

        <div className="flex items-center space-x-1 cursor-pointer hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] px-1.5 py-0.5 rounded text-xs text-[#1677ff] dark:text-[#38bdf8]">
          <Globe className="w-3.5 h-3.5" />
          <span>EN</span>
          <ChevronDown className="w-3 h-3 text-[#64748b]" />
        </div>
      </div>
    </div>
  );
};
