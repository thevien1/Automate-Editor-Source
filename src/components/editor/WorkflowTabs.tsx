import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Folder, Plus, Trash2, X, FilePlus } from '../common/Icons';

export const WorkflowTabs: React.FC = () => {
  const {
    currentProject,
    activeWorkflowTab,
    setActiveWorkflowTab,
    createSubWorkflow,
    deleteSubWorkflow,
    importSubWorkflow,
  } = useProject();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileNameInput, setFileNameInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isModalOpen]);

  const handleCreateNewWorkflow = async () => {
    const name = fileNameInput.trim();
    if (!name) {
      setModalError('Please enter a file name');
      return;
    }

    const res = await createSubWorkflow(name);
    if (!res.success) {
      setModalError(res.error || 'Failed to create workflow');
      return;
    }

    setIsModalOpen(false);
    setFileNameInput('');
    setModalError(null);
  };

  const handleImportClick = async () => {
    setIsDropdownOpen(false);

    if ((window as any).electronAPI?.openFileDialog) {
      try {
        const filePath = await (window as any).electronAPI.openFileDialog({
          title: 'Import Workflow File',
          filters: [
            { name: 'GScript Files (*.gscript)', extensions: ['gscript'] },
            { name: 'JSON Files (*.json)', extensions: ['json'] },
            { name: 'All Files (*.*)', extensions: ['*'] },
          ],
        });

        if (filePath) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'read',
            payload: { path: filePath },
          });

          if (res?.success && res.content) {
            // Extract file name without extension
            const parts = filePath.split(/[/\\]/);
            const rawFileName = parts[parts.length - 1] || 'imported_workflow';
            const baseName = rawFileName.replace(/\.(gscript|json)$/i, '');
            await importSubWorkflow(baseName, res.content);
          }
        }
      } catch (err: any) {
        console.error('Import file error:', err);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const baseName = file.name.replace(/\.(gscript|json)$/i, '');
        await importSubWorkflow(baseName, content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const subWorkflowNames = Object.keys(currentProject?.subWorkflows || {});

  return (
    <>
      <div className="h-9 bg-white dark:bg-[#0a0f1d] border-b border-[#e2e8f0] dark:border-[#162236] flex items-center justify-between px-3 select-none transition-colors">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
          {/* Main Workflow Tab */}
          <button
            onClick={() => setActiveWorkflowTab('main')}
            className={`flex items-center space-x-2 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeWorkflowTab === 'main'
                ? 'bg-[#e6f4ff] dark:bg-[#0e1e3b] text-[#1677ff] dark:text-[#38bdf8] border border-[#91caff] dark:border-[#1d4ed8]/50 shadow-2xs font-semibold'
                : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] border border-transparent'
            }`}
          >
            <Folder
              className={`w-3.5 h-3.5 ${
                activeWorkflowTab === 'main'
                  ? 'fill-[#1677ff] dark:fill-[#38bdf8] text-[#1677ff] dark:text-[#38bdf8]'
                  : 'text-[#64748b] dark:text-[#94a3b8]'
              }`}
            />
            <span>Main workflow</span>
          </button>

          {/* Sub-workflows Tabs */}
          {subWorkflowNames.map((name) => {
            const isActive = activeWorkflowTab === name;
            return (
              <div
                key={name}
                onClick={() => setActiveWorkflowTab(name)}
                className={`group flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#e6f4ff] dark:bg-[#0e1e3b] text-[#1677ff] dark:text-[#38bdf8] border border-[#91caff] dark:border-[#1d4ed8]/50 shadow-2xs font-semibold'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] border border-transparent'
                }`}
              >
                <Folder
                  className={`w-3.5 h-3.5 ${
                    isActive
                      ? 'fill-[#1677ff] dark:fill-[#38bdf8] text-[#1677ff] dark:text-[#38bdf8]'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  }`}
                />
                <span className="truncate max-w-[130px]">{name}</span>

                {/* Delete Tab Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSubWorkflow(name);
                  }}
                  className="p-0.5 ml-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 hover:text-red-600 transition-colors"
                  title={`Delete ${name}`}
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            );
          })}

          {/* Add Tab Button with Dropdown Menu */}
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#1677ff] dark:text-[#38bdf8] transition-colors ml-0.5 cursor-pointer"
              title="Add Workflow"
            >
              <Plus className="w-4 h-4 font-bold" />
            </button>

            {/* Dropdown Popup Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-[#0f172a] rounded-lg shadow-xl border border-[#e2e8f0] dark:border-[#1e293b] py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setFileNameInput('');
                    setModalError(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center space-x-2.5 px-3 py-2 text-xs text-[#1e293b] dark:text-[#f1f5f9] hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] cursor-pointer w-full text-left transition-colors"
                >
                  <div className="w-4 h-4 flex items-center justify-center text-[#1677ff] dark:text-[#38bdf8]">
                    <FilePlus className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Create new workflow</span>
                </button>

                <button
                  onClick={handleImportClick}
                  className="flex items-center space-x-2.5 px-3 py-2 text-xs text-[#1e293b] dark:text-[#f1f5f9] hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] cursor-pointer w-full text-left transition-colors"
                >
                  <div className="w-4 h-4 flex items-center justify-center text-[#10b981]">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
                      <path fillRule="evenodd" d="M10.854 9.146a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L8 10.293V6.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708 0z" />
                    </svg>
                  </div>
                  <span className="font-medium">Import from existing file</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input for web fallback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".gscript,.json"
        className="hidden"
      />

      {/* New Workflow Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl shadow-2xl max-w-sm w-full p-5 text-left animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9] dark:border-[#1e293b]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] dark:bg-[#1e293b] flex items-center justify-center text-[#64748b] dark:text-[#94a3b8]">
                  <FilePlus className="w-4 h-4 text-[#1677ff] dark:text-[#38bdf8]" />
                </div>
                <h3 className="text-sm font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
                  New workflow file
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-[#94a3b8] hover:text-[#64748b] dark:hover:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
                File name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={fileNameInput}
                onChange={(e) => {
                  setFileNameInput(e.target.value);
                  if (modalError) setModalError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewWorkflow();
                  } else if (e.key === 'Escape') {
                    setIsModalOpen(false);
                  }
                }}
                placeholder="e.g. login_helper"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#0a0f1d] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#334155] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none focus:ring-1 focus:ring-[#1677ff]/30 dark:focus:ring-[#38bdf8]/30 transition-colors"
              />
              {modalError && (
                <p className="text-[11px] text-red-500 dark:text-red-400 mt-1.5 font-medium">
                  {modalError}
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-[#f1f5f9] font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewWorkflow}
                className="px-4 py-1.5 text-xs bg-[#1677ff] hover:bg-[#4096ff] text-white font-medium rounded-md shadow-xs transition-colors cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
