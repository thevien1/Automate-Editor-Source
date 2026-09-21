import React, { useState } from 'react';
import { NormalBlockNode, ActionNode } from '../../types/gscript';
import { useProject } from '../../context/ProjectContext';
import { ActionNodeItem } from './ActionNodeItem';
import { Box, ChevronDown, ChevronRight } from '../common/Icons';

interface BlockItemProps {
  blockKey: 'before_init' | 'main_logic' | 'after_quit';
  block: NormalBlockNode;
  stepNumber: number;
}

export const BlockItem: React.FC<BlockItemProps> = ({ block, blockKey, stepNumber }) => {
  const { selectedNodeId, selectedBlockKey, selectNode } = useProject();
  const [isExpanded, setIsExpanded] = useState(true);

  const isSelected = selectedBlockKey === blockKey && selectedNodeId === block.id;
  const isTargetBlock = selectedBlockKey === blockKey;

  return (
    <div
      onClick={() => selectNode(block.id, blockKey)}
      className={`bg-white rounded-lg border transition-all mb-3 overflow-hidden select-none cursor-pointer ${
        isSelected
          ? 'border-[#1677ff] shadow-sm ring-1 ring-[#1677ff]/20'
          : isTargetBlock
          ? 'border-[#91caff]'
          : 'border-[#e8e8e8] hover:border-[#d9d9d9]'
      }`}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#fafafa] border-b border-[#f0f0f0]">
        <div className="flex items-center space-x-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 rounded hover:bg-[#eaeaea] text-[#8c8c8c]"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-gray-600">
            <Box className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-[#262626]">Normal block</span>
            <span className="text-xs text-[#8c8c8c] font-normal">{block.display_text}</span>
          </div>
        </div>

        {/* Step Badge (Image 2 shows '1', '2', '3') */}
        <div className="w-6 h-6 rounded bg-[#f0f0f0] flex items-center justify-center text-xs text-[#8c8c8c] font-medium">
          {stepNumber}
        </div>
      </div>

      {/* Block Content (Action nodes) */}
      {isExpanded && (
        <div className="p-3 bg-white">
          {block.nodes.length === 0 ? (
            <div className="py-4 text-center text-xs text-[#bfbfbf] border border-dashed border-[#e8e8e8] rounded-md">
              No actions inside this block. Double-click actions in the left panel to add.
            </div>
          ) : (
            <div className="space-y-1">
              {block.nodes.map((node, idx) => (
                <ActionNodeItem key={node.id} node={node as ActionNode} index={idx} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
