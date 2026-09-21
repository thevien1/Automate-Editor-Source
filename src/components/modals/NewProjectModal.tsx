import React, { useState } from 'react';
import { X, Folder, Globe, FolderPlus } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const { createNewProject } = useProject();
  const [projectName, setProjectName] = useState('Untitled');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('Anonymous');
  const [version, setVersion] = useState('1.0.0');
  const [saveLocation, setSaveLocation] = useState('');

  React.useEffect(() => {
    if ((window as any).electronAPI?.getDefaultSavePath) {
      (window as any).electronAPI.getDefaultSavePath().then((defaultPath: string) => {
        if (defaultPath) {
          setSaveLocation(defaultPath);
        }
      });
    }
  }, []);

  if (!isOpen) return null;

  const handleBrowseLocation = async () => {
    if ((window as any).electronAPI?.openFolderDialog) {
      const selected = await (window as any).electronAPI.openFolderDialog();
      if (selected) {
        setSaveLocation(selected);
      }
    } else {
      const custom = prompt('Enter save directory path:', saveLocation);
      if (custom) setSaveLocation(custom);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const fullFolderPath = `${saveLocation.replace(/[/\\]+$/, '')}\\${projectName.trim()}`;

    createNewProject(projectName.trim(), fullFolderPath, {
      description: description.trim() || null,
      author_info: author.trim() || 'Anonymous',
      version: version.trim() || '1.0.0',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 select-none animate-in fade-in p-4 text-[#f1f5f9]">
      <div className="bg-[#0b101e] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-[#1e293b] flex flex-col max-h-[92vh]">
        {/* Modal Window Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#162236] bg-[#070b16]">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-[#38bdf8] flex items-center justify-center text-[10px] text-black font-bold">
              G
            </div>
            <span className="text-xs font-semibold text-[#cbd5e1]">New Project</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white p-1 rounded hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-5 text-left">
          {/* Main Title & Subtitle with FolderPlus Icon */}
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0e1e3b] border border-[#1d4ed8]/40 flex items-center justify-center text-[#38bdf8] shrink-0 shadow-sm">
              <FolderPlus className="w-6 h-6 fill-[#38bdf8]/20" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                New Project
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Configure your project basics. You can change them later in the project settings.
              </p>
            </div>
          </div>

          {/* App Type Section (Browser only) */}
          <div>
            <div className="text-xs font-semibold text-[#94a3b8] mb-2">
              App Type
            </div>
            <div className="w-48 p-4 rounded-xl border-2 border-[#38bdf8] bg-[#0e1a33] flex flex-col items-center text-center cursor-pointer shadow-md shadow-cyan-500/10">
              <div className="w-10 h-10 rounded-full bg-[#0369a1]/30 flex items-center justify-center text-[#38bdf8] mb-2">
                <Globe className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-[#38bdf8]">Browser</span>
              <span className="text-[11px] text-[#94a3b8] mt-0.5">Web automation</span>
            </div>
          </div>

          {/* Project Information Box */}
          <div>
            <div className="text-xs font-semibold text-[#94a3b8] mb-2">
              Project Information
            </div>
            <div className="border border-[#162236] bg-[#070c17] rounded-xl p-4 space-y-3.5">
              {/* Project Name */}
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Untitled"
                  className="w-full px-3 py-1.5 text-xs bg-[#0b1222] text-[#f8fafc] border border-[#1e293b] rounded-lg hover:border-[#38bdf8] focus:border-[#38bdf8] focus:outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Enter project description..."
                  className="w-full px-3 py-1.5 text-xs bg-[#0b1222] text-[#f8fafc] border border-[#1e293b] rounded-lg hover:border-[#38bdf8] focus:border-[#38bdf8] focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Author & Version Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Anonymous"
                    className="w-full px-3 py-1.5 text-xs bg-[#0b1222] text-[#f8fafc] border border-[#1e293b] rounded-lg hover:border-[#38bdf8] focus:border-[#38bdf8] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94a3b8] mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full px-3 py-1.5 text-xs bg-[#0b1222] text-[#f8fafc] border border-[#1e293b] rounded-lg hover:border-[#38bdf8] focus:border-[#38bdf8] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Location */}
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
              Save Location
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                required
                value={saveLocation}
                onChange={(e) => setSaveLocation(e.target.value)}
                placeholder="Select or enter save directory..."
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-[#070c17] text-[#38bdf8] border border-[#1e293b] rounded-lg hover:border-[#38bdf8] focus:border-[#38bdf8] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleBrowseLocation}
                className="px-3 py-1.5 bg-[#162236] hover:bg-[#1e2e47] text-[#cbd5e1] rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors border border-[#1e293b]"
              >
                <Folder className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Browse</span>
              </button>
            </div>
            <p className="text-[11px] text-[#64748b] mt-1.5">
              Folder will be created at: <span className="font-mono text-[#38bdf8] font-medium">{saveLocation}\{projectName}</span>
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#162236]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#94a3b8] hover:bg-[#162236] hover:text-white rounded-lg transition-colors border border-[#1e293b]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-lg transition-colors shadow-md shadow-sky-500/20"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
