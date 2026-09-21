import React from 'react';
import { ActionNode } from '../../types/gscript';
import { useProject } from '../../context/ProjectContext';
import { Trash2, Terminal } from '../common/Icons';

interface ActionNodeItemProps {
  node: ActionNode;
  index: number;
}

export const ActionNodeItem: React.FC<ActionNodeItemProps> = ({ node, index }) => {
  const { selectedNodeId, selectNode, deleteSelectedNode } = useProject();
  const isSelected = selectedNodeId === node.id;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        selectNode(node.id);
      }}
      className={`flex items-center justify-between px-3 py-2 my-1 rounded border transition-all cursor-pointer group ${
        isSelected
          ? 'bg-[#e6f4ff] border-[#1677ff] shadow-sm'
          : 'bg-white border-[#e8e8e8] hover:border-[#bae0ff] hover:bg-[#fafafa]'
      }`}
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-5 h-5 rounded bg-[#f5f5f5] flex items-center justify-center text-[#595959] group-hover:text-[#1677ff]">
          <Terminal className="w-3 h-3" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-[#262626] truncate">
            {node.display_text || `Action (${node.type})`}
          </div>
          {node.comment && (
            <div className="text-[10px] text-[#8c8c8c] truncate">
              {node.comment}
            </div>
          )}
          {node.element_xpath && (
            <div className="text-[10px] text-[#1677ff] font-mono truncate">
              {node.element_xpath}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-[10px] text-[#bfbfbf] font-mono">
          #{index + 1}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            selectNode(node.id);
            deleteSelectedNode();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-500 transition-opacity"
          title="Delete action"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
