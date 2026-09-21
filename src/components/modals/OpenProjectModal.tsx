import React, { useState } from 'react';
import { X, FolderOpen } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenProjectModal: React.FC<OpenProjectModalProps> = ({ isOpen, onClose }) => {
  const { openProjectByPath } = useProject();
  const [folderPath, setFolderPath] = useState('');

  if (!isOpen) return null;

  const handleBrowse = async () => {
    if ((window as any).electronAPI?.openFolderDialog) {
      const selected = await (window as any).electronAPI.openFolderDialog();
      if (selected) {
        setFolderPath(selected);
      }
    } else {
      const custom = prompt('Enter project directory path:', folderPath);
      if (custom) setFolderPath(custom);
    }
  };

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) return;
    openProjectByPath(folderPath.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 select-none animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-[#e8e8e8]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0f0f0] bg-[#fafafa]">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#1677ff] flex items-center justify-center text-white">
              <FolderOpen className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#1f1f1f]">Open Existing Project</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c8c8c] hover:text-[#262626] p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleOpen} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#595959] mb-1.5">
              Select Project Directory
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                required
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="D:\Path\To\Project"
                className="flex-1 px-3 py-1.5 text-xs font-mono border border-[#d9d9d9] rounded-lg hover:border-[#4096ff] focus:border-[#1677ff] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="px-3 py-1.5 bg-[#f5f5f5] hover:bg-[#e8e8e8] text-[#595959] rounded-lg text-xs transition-colors"
              >
                Browse
              </button>
            </div>
            <p className="text-[11px] text-[#8c8c8c] mt-1">
              Select folder containing info.gpmsln and src.gscript
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-[#595959] hover:bg-[#f5f5f5] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#1677ff] hover:bg-[#4096ff] rounded-lg transition-colors shadow-sm"
            >
              Open Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
