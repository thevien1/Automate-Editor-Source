import React from 'react';
import { X, Keyboard } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

export const ShortcutsOverlay: React.FC = () => {
  const { showShortcuts, setShowShortcuts } = useProject();

  if (!showShortcuts) return null;

  const shortcutsList = [
    { key: 'Ctrl + Click', desc: 'Select / deselect multiple' },
    { key: 'Shift + Click', desc: 'Select range of nodes' },
    { key: 'Ctrl+A', desc: 'Select all nodes' },
    { key: 'Ctrl+C', desc: 'Copy selected node(s)' },
    { key: 'Ctrl+V', desc: 'Paste copied node(s)' },
    { key: 'Ctrl+X', desc: 'Cut selected node(s)' },
    { key: 'Ctrl+D', desc: 'Duplicate node(s)' },
    { key: 'Ctrl+Z', desc: 'Undo' },
    { key: 'Ctrl+Y', desc: 'Redo' },
    { key: 'Del / Backspace', desc: 'Delete node(s)' },
    { key: 'Ctrl+S', desc: 'Save workflow' },
    { key: 'Ctrl+F', desc: 'Find / Search' },
  ];

  return (
    <div className="absolute bottom-4 right-6 w-60 bg-[#141a29] text-white rounded-lg shadow-2xl p-3 text-xs z-30 select-none border border-[#263554]/50 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#263554]">
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded bg-[#1677ff] flex items-center justify-center">
            <Keyboard className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="font-semibold text-xs text-gray-200">Shortcuts</span>
        </div>

        <button
          onClick={() => setShowShortcuts(false)}
          className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Shortcut items */}
      <div className="space-y-1.5">
        {shortcutsList.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="bg-[#242e47] text-gray-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-[#374567]">
              {item.key}
            </span>
            <span className="text-[11px] text-gray-400 text-right">
              {item.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
