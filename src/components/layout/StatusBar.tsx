import React from 'react';
import { CheckCircle2, Folder, AlertTriangle } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

export const StatusBar: React.FC = () => {
  const { currentProject } = useProject();

  if (!currentProject) return null;

  return (
    <div className="h-6 bg-[#1677ff] text-white flex items-center justify-between px-3 text-xs select-none shadow-inner">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          <span>Ready</span>
        </div>
        <div className="flex items-center space-x-1.5 opacity-90">
          <Folder className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px] truncate max-w-xl">{currentProject.folderPath}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-blue-600 cursor-pointer">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>0 Error List</span>
        </div>
      </div>
    </div>
  );
};
