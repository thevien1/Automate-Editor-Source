import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Folder, Plus, Trash2, X, FilePlus, ChevronLeft, ChevronRight } from '../common/Icons';

export const WorkflowTabs: React.FC = () => {
  const {
    currentProject,
    activeWorkflowTab,
    setActiveWorkflowTab,
    createSubWorkflow,
    deleteSubWorkflow,
    importSubWorkflow,
    showConfirmModal,
  } = useProject();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileNameInput, setFileNameInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Check scroll position to show/hide scroll buttons
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

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

  // Mouse wheel listener with passive: false to allow horizontal scrolling
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScroll();

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  // Auto-scroll to active tab when it changes
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeEl = el.querySelector('[data-active="true"]') as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    setTimeout(checkScroll, 250);
  }, [activeWorkflowTab]);

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

  const handleScrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -220, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 220, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    isMouseDownRef.current = true;
    startXRef.current = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    scrollLeftRef.current = scrollContainerRef.current?.scrollLeft || 0;
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !scrollContainerRef.current) return;
    const x = e.pageX - (scrollContainerRef.current.offsetLeft || 0);
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 4) {
      isDraggingRef.current = true;
      scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  const subWorkflowNames = Object.keys(currentProject?.subWorkflows || {});

  return (
    <>
      <div className="h-9 bg-white dark:bg-[#0a0f1d] border-b border-[#e2e8f0] dark:border-[#162236] flex items-center justify-between px-2 select-none transition-colors relative z-30">
        {/* Left Scroll Button (shown when tabs overflow to the left) */}
        {canScrollLeft && (
          <button
            onClick={handleScrollLeft}
            className="w-5 h-6 flex items-center justify-center rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] transition-colors shrink-0 mr-1 cursor-pointer"
            title="Cuộn sang trái (hoặc lăn chuột)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Scrollable Tabs Container */}
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 min-w-0 flex items-center space-x-1 overflow-x-auto no-scrollbar py-1 scroll-smooth"
        >
          {/* Main Workflow Tab */}
          <button
            data-active={activeWorkflowTab === 'main' ? 'true' : 'false'}
            onClick={() => {
              if (!isDraggingRef.current) setActiveWorkflowTab('main');
            }}
            className={`shrink-0 flex items-center space-x-2 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
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
                data-active={isActive ? 'true' : 'false'}
                onClick={() => {
                  if (!isDraggingRef.current) setActiveWorkflowTab(name);
                }}
                className={`shrink-0 group flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
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
                    showConfirmModal({
                      title: 'Delete Workflow File',
                      subtitle: `Xóa tệp quy trình "${name}.gscript"`,
                      message: (
                        <span>
                          Bạn có chắc chắn muốn xóa tab quy trình <span className="text-red-500 font-semibold">{name}</span> khỏi dự án không?
                        </span>
                      ),
                      confirmText: 'Delete',
                      cancelText: 'Hủy',
                      variant: 'danger',
                      itemName: `${name}.gscript`,
                      itemType: 'Sub-workflow File',
                      warningNote: 'Tệp này và toàn bộ các khối lệnh bên trong sẽ bị xóa khỏi dự án. Hãy kiểm tra kỹ trước khi xóa.',
                      onConfirm: () => {
                        deleteSubWorkflow(name);
                      },
                    });
                  }}
                  className="p-0.5 ml-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 hover:text-red-600 transition-colors"
                  title={`Delete ${name}`}
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Scroll Button (shown when tabs overflow to the right) */}
        {canScrollRight && (
          <button
            onClick={handleScrollRight}
            className="w-5 h-6 flex items-center justify-center rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] dark:text-[#94a3b8] transition-colors shrink-0 ml-1 cursor-pointer"
            title="Cuộn sang phải (hoặc lăn chuột)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Right: + Button with Dropdown Menu (Positioned on the far right matching Image 1) */}
        <div className="relative shrink-0 ml-2" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#1677ff] dark:text-[#38bdf8] transition-colors cursor-pointer"
            title="Add workflow"
          >
            <Plus className="w-4 h-4 font-bold" />
          </button>

          {/* Dropdown Menu (Opens downwards on the right exactly matching Image 1) */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-[#0f172a] rounded-lg shadow-xl border border-[#e2e8f0] dark:border-[#1e293b] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setFileNameInput('');
                  setModalError(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs text-[#1e293b] dark:text-[#f1f5f9] hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] cursor-pointer w-full text-left transition-colors"
              >
                <div className="w-4 h-4 flex items-center justify-center text-[#1677ff] dark:text-[#38bdf8] shrink-0">
                  <FilePlus className="w-4 h-4" />
                </div>
                <span className="font-medium">Create new workflow</span>
              </button>

              <button
                onClick={handleImportClick}
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs text-[#1e293b] dark:text-[#f1f5f9] hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] cursor-pointer w-full text-left transition-colors"
              >
                <div className="w-4 h-4 flex items-center justify-center text-[#10b981] shrink-0">
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

      {/* Hidden file input for web fallback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".gscript,.json"
        className="hidden"
      />

      {/* New Workflow Modal matching media_1790316342949.png */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-2xl shadow-2xl max-w-[440px] w-full p-6 text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] dark:bg-[#1e293b] flex items-center justify-center text-[#475569] dark:text-[#94a3b8]">
                  <FilePlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
                  New workflow file
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-[#94a3b8] hover:text-[#64748b] dark:hover:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-5">
              <label className="block text-sm text-[#475569] dark:text-[#94a3b8] mb-2 font-normal">
                File name
              </label>
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={fileNameInput}
                onChange={(e) => {
                  setFileNameInput(e.target.value);
                  if (modalError) setModalError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateNewWorkflow();
                  } else if (e.key === 'Escape') {
                    setIsModalOpen(false);
                  }
                }}
                placeholder="e.g. login_helper"
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#0a0f1d] text-[#1e293b] dark:text-[#f1f5f9] border border-[#1677ff] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1677ff] transition-colors shadow-2xs"
              />
              {modalError && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-2 font-medium">
                  {modalError}
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-4 mt-7">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sm text-[#1677ff] hover:text-[#4096ff] font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewWorkflow}
                className="px-6 py-2 text-sm bg-[#0084ff] hover:bg-[#0070d6] text-white font-medium rounded-md shadow-xs transition-colors cursor-pointer"
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
