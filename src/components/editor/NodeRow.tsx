import React, { useState, useEffect } from 'react';
import { WorkflowNode, ActionNode } from '../../types/gscript';
import { useProject } from '../../context/ProjectContext';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Palette,
} from '../common/Icons';
import {
  ActionIcon,
  getEffectiveCustomOverride,
  adjustHexBrightness,
  isLightColor,
} from '../common/ActionIcon';
import { ActionDefinition } from '../../types/ui';
import { ActionIconEditorModal } from '../modals/ActionIconEditorModal';

interface NodeRowProps {
  node: WorkflowNode;
  stepNumber: number;
  depth?: number;
  parentId?: string | null;
  indexInParent: number;
  isRoot?: boolean;
}

export const NodeRow: React.FC<NodeRowProps> = ({
  node,
  stepNumber,
  depth = 0,
  parentId = null,
  indexInParent,
  isRoot = false,
}) => {
  const {
    selectedNodeId,
    selectedNodeIds = [],
    selectNode,
    deleteSelectedNode,
    insertActionOrBlock,
    toggleBlockExpand,
    moveNode,
  } = useProject();
  type DropPosition = 'top' | 'bottom' | 'inside' | null;
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [isDraggingThis, setIsDraggingThis] = useState(false);
  const [isEmptyZoneDragOver, setIsEmptyZoneDragOver] = useState(false);
  const [isContainerEndDragOver, setIsContainerEndDragOver] = useState(false);
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [, setCustomIconVer] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setCustomIconVer((v) => v + 1);
    window.addEventListener('gpm_custom_icons_updated', handleUpdate);
    return () => window.removeEventListener('gpm_custom_icons_updated', handleUpdate);
  }, []);

  const isSelected = selectedNodeIds.includes(node.id) || selectedNodeId === node.id;
  const isBlock = 'nodes' in node && Array.isArray((node as any).nodes);
  const blockChildren = isBlock ? ((node as any).nodes as WorkflowNode[]) : [];
  const isExpanded = isBlock ? ((node as any).expanded !== false) : false;

  const isFor = isBlock && (node.$type?.includes('ForBlockNode') || node.display_text?.toLowerCase() === 'for');
  const isWhile = isBlock && (node.$type?.includes('WhileBlockNode') || node.display_text?.toLowerCase() === 'while');
  const isElseIf = isBlock && (node.display_text?.toLowerCase().includes('else if') || (node as any).type === 105);
  const isElse = isBlock && !isElseIf && (node.display_text?.toLowerCase().trim() === 'else' || (node as any).type === 106);
  const isIf = isBlock && !isElseIf && !isElse && (node.$type?.includes('IfBlockNode') || node.display_text?.toLowerCase().startsWith('if'));
  const isNormalBlock = isBlock && !isFor && !isIf && !isWhile && !isElseIf && !isElse;

  const blockType = isFor
    ? 'for'
    : isWhile
    ? 'while'
    : isElseIf
    ? 'else if'
    : isElse
    ? 'else'
    : isIf
    ? 'if'
    : isNormalBlock
    ? 'normal block'
    : undefined;

  const customOverride = isBlock
    ? getEffectiveCustomOverride(node.display_text, (node as any).type, blockType)
    : getEffectiveCustomOverride((node as ActionNode).display_text, (node as ActionNode).type);

  const isHeaderLight = customOverride?.color ? isLightColor(customOverride.color) : false;

  // Custom Icon matching Actions sidebar and PropertyPanel
  const getActionIcon = () => {
    if (isBlock) {
      return (
        <ActionIcon
          actionName={node.display_text}
          blockType={blockType}
          isBlockHeader={true}
          className={`w-4 h-4 ${isHeaderLight ? 'text-slate-900' : 'text-white'}`}
        />
      );
    }

    const act = node as ActionNode;
    return (
      <ActionIcon
        actionName={act.display_text}
        actionType={act.type}
        className="w-3.5 h-3.5"
      />
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/gpm-node-id', node.id);
    e.dataTransfer.effectAllowed = 'all';
    setIsDraggingThis(true);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDraggingThis(false);
    setDropPosition(null);
  };

  const handleActionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const height = rect.height;

    if (mouseY < height / 2) {
      setDropPosition('top');
    } else {
      setDropPosition('bottom');
    }
  };

  const handleBlockHeaderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const height = rect.height;

    if (!isRoot && mouseY < height * 0.3) {
      setDropPosition('top');
    } else if (!isRoot && mouseY > height * 0.7) {
      setDropPosition('bottom');
    } else {
      setDropPosition('inside');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Fallback: Compute position immediately from coordinates in case state was cleared
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const height = rect.height;

    let pos = dropPosition;
    if (!pos) {
      if (isBlock) {
        if (!isRoot && mouseY < height * 0.3) pos = 'top';
        else if (!isRoot && mouseY > height * 0.7) pos = 'bottom';
        else pos = 'inside';
      } else {
        pos = mouseY < height / 2 ? 'top' : 'bottom';
      }
    }
    setDropPosition(null);

    const targetPos: 'before' | 'after' | 'inside' =
      isBlock && pos === 'inside'
        ? 'inside'
        : pos === 'top'
        ? 'before'
        : 'after';

    const rawAction = e.dataTransfer.getData('application/gpm-action');
    if (rawAction) {
      try {
        const actionDef: ActionDefinition = JSON.parse(rawAction);
        insertActionOrBlock(actionDef, node.id, targetPos);
      } catch (err) {
        console.error('Drop action parse error', err);
      }
      return;
    }

    const draggedNodeId = e.dataTransfer.getData('application/gpm-node-id');
    if (draggedNodeId && draggedNodeId !== node.id) {
      moveNode(draggedNodeId, node.id, targetPos);
    }
  };

  // Outer block container border and background
  const getBlockContainerStyle = () => {
    if (isSelected) {
      return 'border-2 border-[#1677ff] dark:border-[#38bdf8] bg-white dark:bg-[#0b111e] shadow-sm';
    }
    return 'border border-[#d9d9d9] dark:border-[#1e293b] bg-white dark:bg-[#0b111e] shadow-xs';
  };

  // Block header banner styling (matching Image 1 & custom colors)
  const getBlockHeaderStyle = () => {
    if (customOverride?.color) {
      return ''; // Inline style handles background and text color
    }
    if (isFor) {
      return 'bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white';
    }
    if (isIf || isElseIf || isElse) {
      return 'bg-gradient-to-r from-[#6b21a8] to-[#7e22ce] text-white';
    }
    if (isWhile) {
      return 'bg-gradient-to-r from-[#0f766e] to-[#0d9488] text-white';
    }
    // Normal block
    return 'bg-gradient-to-r from-[#334155] to-[#475569] text-white';
  };

  const getBlockHeaderInlineStyle = (): React.CSSProperties | undefined => {
    if (customOverride?.color) {
      const c = customOverride.color;
      return {
        background: `linear-gradient(to right, ${c}, ${adjustHexBrightness(c, -16)})`,
        color: isHeaderLight ? '#0f172a' : '#ffffff',
      };
    }
    return undefined;
  };

  // Extract comment or parameters for cyan display
  const getSubtext = () => {
    if (isBlock) {
      if (isFor) {
        const f = node as any;
        return `${f.start || 0} ➔ ${f.end || 100}`;
      }
      if (isIf || isWhile || isElseIf) {
        return (node as any).condition || node.comment || '';
      }
      return node.comment || '';
    }

    const act = node as ActionNode;
    if (act.comment) return act.comment;
    if (act.element_xpath) return act.element_xpath;

    // For File append line: show concise mode and text
    if (act.type === 20 || act.display_text?.toLowerCase() === 'file append line') {
      try {
        const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
        const opt = (parsed?.find((p: any) => p.Key === 'OPTION')?.Value || parsed?.find((p: any) => p.Key === 'MODE')?.Value || 'Append line').trim();
        const txt = parsed?.find((p: any) => p.Key === 'TEXT')?.Value || '';
        const lineIdx = parsed?.find((p: any) => p.Key === 'LINE_INDEX')?.Value || '';
        if (opt.toLowerCase().includes('update')) {
          return `Update line ${lineIdx ? `#${lineIdx}` : '(current)'} › ${txt}`;
        }
        if (txt) return `Append line › ${txt}`;
      } catch (e) {}
    }

    // For Increase / Decrease variable
    if (act.type === 2 || act.type === 3 || act.display_text?.toLowerCase().includes('increase') || act.display_text?.toLowerCase().includes('decrease')) {
      try {
        const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
        const cur = parsed?.find((p: any) => p.Key === 'CURRENT_VAL')?.Value || '';
        const step = parsed?.find((p: any) => p.Key === 'INCREASE_BY' || p.Key === 'DECREASE_BY' || p.Key === 'DESCREASE_BY')?.Value || '1';
        const rawOut = (act.output_variable_name || parsed?.find((p: any) => p.Key === 'OUTPUT_VAR')?.Value || '').trim();
        const out = rawOut ? ` ➔ $${rawOut.replace(/^\$/, '')}` : '';
        const op = (act.type === 3 || act.display_text?.toLowerCase().includes('decrease')) ? '-' : '+';
        if (cur) return `${cur} ${op} ${step}${out}`;
      } catch (e) {}
    }

    if (act.raw_input) {
      try {
        const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
        if (Array.isArray(parsed)) {
          const parts = parsed
            .filter((p: any) => p.Value && p.Value.trim())
            .map((p: any) => `${p.Key}=${p.Value}`);
          if (parts.length > 0) return parts.join('  ');
        }
      } catch (e) {}
    }
    return '';
  };

  const subtext = getSubtext();
  const displayText = node.display_text || (isBlock ? 'Block' : 'Action');

  // BLOCK CONTAINER (Enclosing box matching Image 1)
  if (isBlock) {
    return (
      <div
        style={
          !isSelected && customOverride?.color
            ? { borderColor: `${customOverride.color}45` }
            : undefined
        }
        className={`relative select-none my-1.5 transition-all rounded-lg border ${getBlockContainerStyle()} ${
          dropPosition === 'inside'
            ? 'ring-2 ring-[#1677ff] dark:ring-[#38bdf8] shadow-[0_0_12px_rgba(22,119,255,0.25)] border-[#1677ff] dark:border-[#38bdf8]'
            : ''
        } ${isDraggingThis ? 'opacity-35 border-dashed border-[#1677ff]' : ''}`}
      >
        {/* Top Drop Indicator Bar */}
        {dropPosition === 'top' && !isRoot && (
          <div className="absolute -top-[2px] left-0 right-0 z-30 pointer-events-none flex items-center">
            <div className="w-2 h-2 rounded-full bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.6)] -ml-1 border border-white dark:border-[#0b111e]" />
            <div className="flex-1 h-[2px] bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.5)]" />
            <div className="w-2 h-2 rounded-full bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.6)] -mr-1 border border-white dark:border-[#0b111e]" />
          </div>
        )}

        {/* Bottom Drop Indicator Bar */}
        {dropPosition === 'bottom' && !isRoot && (
          <div className="absolute -bottom-[2px] left-0 right-0 z-30 pointer-events-none flex items-center">
            <div className="w-2 h-2 rounded-full bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.6)] -ml-1 border border-white dark:border-[#0b111e]" />
            <div className="flex-1 h-[2px] bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.5)]" />
            <div className="w-2 h-2 rounded-full bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.6)] -mr-1 border border-white dark:border-[#0b111e]" />
          </div>
        )}

        {/* Block Header Banner (matching Image 1) */}
        <div
          draggable={!isRoot}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleBlockHeaderDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={(e) => {
            e.stopPropagation();
            const isMulti = e.ctrlKey || e.metaKey;
            const isRange = e.shiftKey;
            selectNode(node.id, undefined, isMulti, isRange);
          }}
          style={getBlockHeaderInlineStyle()}
          className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all ${
            isExpanded ? 'rounded-t-md border-b border-black/10 dark:border-white/10' : 'rounded-md'
          } ${getBlockHeaderStyle()}`}
        >
          {/* Left Side: Collapse arrow, icon, title, subtext, count badge */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBlockExpand(node.id);
              }}
              className={`p-0.5 rounded hover:bg-black/20 dark:hover:bg-white/20 shrink-0 transition-colors ${
                isHeaderLight ? 'text-slate-800' : 'text-white/90'
              }`}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            <div className={`shrink-0 flex items-center justify-center ${isHeaderLight ? 'text-slate-900' : 'text-white/90'}`}>
              {getActionIcon()}
            </div>

            <div className="flex items-center space-x-2 truncate">
              <span className={`font-bold text-xs tracking-tight shrink-0 ${isHeaderLight ? 'text-slate-900' : 'text-white'}`}>
                {displayText}
              </span>
              {subtext && (
                <span className={`text-[11px] truncate font-mono ${
                  isHeaderLight ? 'text-blue-900 font-semibold' : 'text-cyan-200 dark:text-[#38bdf8]'
                }`}>
                  {subtext}
                </span>
              )}
            </div>

            {blockChildren.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium border shrink-0 ${
                isHeaderLight
                  ? 'bg-black/10 text-slate-800 border-black/15'
                  : 'bg-black/25 dark:bg-black/40 text-white/90 border-white/15'
              }`}>
                {blockChildren.length} block
              </span>
            )}

            {dropPosition === 'inside' && (
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-blue-500 text-white animate-pulse shrink-0 shadow-sm">
                Drop inside ↵
              </span>
            )}
          </div>

          {/* Right Side: Palette, Delete and Step number pill */}
          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingIcon(true);
              }}
              className={`p-1 rounded hover:bg-black/20 dark:hover:bg-white/20 transition-colors ${
                isHeaderLight ? 'text-slate-700 hover:text-slate-900' : 'text-white/80 hover:text-white'
              }`}
              title="Đổi màu sắc & Icon"
            >
              <Palette className="w-3 h-3" />
            </button>

            {!isRoot && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSelected) selectNode(node.id);
                  deleteSelectedNode();
                }}
                className={`opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded hover:bg-black/30 transition-opacity ${
                  isHeaderLight ? 'text-slate-800' : 'text-white/80 hover:text-white'
                }`}
                title="Delete (Del)"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}

            {/* Dark pill step badge like Image 1 */}
            <div className={`w-6 h-5 rounded-full text-[11px] font-mono flex items-center justify-center border ${
              isHeaderLight
                ? 'bg-black/10 text-slate-800 border-black/15'
                : 'bg-black/35 text-white border-white/20'
            }`}>
              {stepNumber}
            </div>
          </div>
        </div>

        {/* Children Body inside the Block Box (matching Image 1!) */}
        {isExpanded && (
          <div className="p-2 pt-2 pb-2">
            {blockChildren.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  setIsEmptyZoneDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEmptyZoneDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEmptyZoneDragOver(false);
                  const rawAction = e.dataTransfer.getData('application/gpm-action');
                  if (rawAction) {
                    try {
                      const actionDef: ActionDefinition = JSON.parse(rawAction);
                      insertActionOrBlock(actionDef, node.id, 'inside');
                    } catch (err) {
                      console.error(err);
                    }
                    return;
                  }
                  const draggedNodeId = e.dataTransfer.getData('application/gpm-node-id');
                  if (draggedNodeId && draggedNodeId !== node.id) {
                    moveNode(draggedNodeId, node.id, 'inside');
                  }
                }}
                className={`min-h-[38px] flex items-center justify-center rounded-md border-2 border-dashed text-xs transition-all ${
                  isEmptyZoneDragOver
                    ? 'border-[#1677ff] dark:border-[#38bdf8] bg-blue-500/15 text-[#1677ff] dark:text-[#38bdf8] font-medium shadow-sm'
                    : 'border-slate-200 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 hover:border-slate-300'
                }`}
              >
                {isEmptyZoneDragOver ? '+ Drop inside this block' : 'Drop actions here'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {blockChildren.map((childNode, idx) => (
                  <NodeRow
                    key={childNode.id}
                    node={childNode}
                    stepNumber={stepNumber + idx + 1}
                    depth={depth + 1}
                    parentId={node.id}
                    indexInParent={idx}
                  />
                ))}

                {/* Drop strip at the bottom of non-empty block */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                    setIsContainerEndDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsContainerEndDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsContainerEndDragOver(false);
                    const rawAction = e.dataTransfer.getData('application/gpm-action');
                    if (rawAction) {
                      try {
                        const actionDef: ActionDefinition = JSON.parse(rawAction);
                        insertActionOrBlock(actionDef, node.id, 'inside');
                      } catch (err) {
                        console.error(err);
                      }
                      return;
                    }
                    const draggedNodeId = e.dataTransfer.getData('application/gpm-node-id');
                    if (draggedNodeId && draggedNodeId !== node.id) {
                      moveNode(draggedNodeId, node.id, 'inside');
                    }
                  }}
                  className={`h-1.5 transition-all relative rounded ${
                    isContainerEndDragOver ? 'h-6 my-1 bg-blue-500/10 border-2 border-dashed border-[#1677ff] dark:border-[#38bdf8]' : ''
                  }`}
                >
                  {isContainerEndDragOver && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[10px] text-[#1677ff] dark:text-[#38bdf8] font-medium">
                      + Insert at end of block
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal chỉnh sửa Icon & Màu sắc cho Block */}
        {isEditingIcon && (
          <ActionIconEditorModal
            isOpen={isEditingIcon}
            actionName={
              isFor
                ? 'for'
                : isWhile
                ? 'while'
                : isElseIf || isElse || isIf
                ? 'if'
                : 'Normal block'
            }
            onClose={() => setIsEditingIcon(false)}
          />
        )}
      </div>
    );
  }

  // ACTION NODE (Image 2 style)
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleActionDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        e.stopPropagation();
        const isMulti = e.ctrlKey || e.metaKey;
        const isRange = e.shiftKey;
        selectNode(node.id, undefined, isMulti, isRange);
      }}
      className={`group relative flex items-center justify-between px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
        isSelected
          ? 'border-2 border-[#1677ff] dark:border-[#38bdf8] bg-blue-50/20 dark:bg-[#101e38] shadow-sm'
          : 'border border-[#e2e8f0] dark:border-[#1a2840] bg-white dark:bg-[#0c1424] hover:border-[#1677ff] dark:hover:border-[#38bdf8] text-[#1e293b] dark:text-[#f1f5f9]'
      } ${dropPosition ? 'ring-1 ring-[#1677ff]/60 dark:ring-[#38bdf8]/60' : ''} ${
        isDraggingThis ? 'opacity-35 border-dashed border-[#1677ff] dark:border-[#38bdf8] scale-[0.99]' : ''
      }`}
    >
      {/* Top Drop Indicator Bar */}
      {dropPosition === 'top' && (
        <div className="absolute -top-[2px] left-0 right-0 z-30 pointer-events-none flex items-center">
          <div className="w-2 h-2 rounded-full bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.6)] -ml-1 border border-white dark:border-[#0b111e]" />
          <div className="flex-1 h-[2px] bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.5)]" />
          <div className="w-2 h-2 rounded-full bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.6)] -mr-1 border border-white dark:border-[#0b111e]" />
        </div>
      )}

      {/* Bottom Drop Indicator Bar */}
      {dropPosition === 'bottom' && (
        <div className="absolute -bottom-[2px] left-0 right-0 z-30 pointer-events-none flex items-center">
          <div className="w-2 h-2 rounded-full bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.6)] -ml-1 border border-white dark:border-[#0b111e]" />
          <div className="flex-1 h-[2px] bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.5)]" />
          <div className="w-2 h-2 rounded-full bg-[#38bdf8] dark:bg-[#7dd3fc] shadow-[0_0_4px_rgba(56,189,248,0.6)] -mr-1 border border-white dark:border-[#0b111e]" />
        </div>
      )}

      {/* Left: Icon, Display Text, Subtext (cyan) */}
      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
        <div className="shrink-0 flex items-center justify-center">
          {getActionIcon()}
        </div>

        <div className="flex items-center space-x-2 truncate">
          <span className="font-semibold text-xs tracking-tight text-[#1e293b] dark:text-[#f8fafc] shrink-0">
            {displayText}
          </span>
          {subtext && (
            <span className="text-[11px] truncate font-mono text-[#0284c7] dark:text-[#38bdf8]">
              {subtext}
            </span>
          )}
        </div>
      </div>

      {/* Right: Palette on hover, Delete button on hover & Step badge */}
      <div className="flex items-center space-x-1 shrink-0 ml-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditingIcon(true);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-500/15 text-amber-500 dark:text-amber-400 transition-opacity"
          title="Đổi màu sắc & Icon"
        >
          <Palette className="w-3 h-3" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isSelected) selectNode(node.id);
            deleteSelectedNode();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15 text-red-500 dark:text-red-400 transition-opacity"
          title="Delete (Del)"
        >
          <Trash2 className="w-3 h-3" />
        </button>

        <div className="w-6 h-5 rounded-md bg-[#f1f5f9] dark:bg-black/40 text-[#64748b] dark:text-[#94a3b8] text-[11px] font-mono flex items-center justify-center border border-[#d9d9d9] dark:border-[#1e293b]">
          {stepNumber}
        </div>
      </div>

      {/* Modal chỉnh sửa Icon & Màu sắc cho Action */}
      {isEditingIcon && (
        <ActionIconEditorModal
          isOpen={isEditingIcon}
          actionName={(node as ActionNode).display_text || 'Action'}
          actionType={(node as ActionNode).type}
          onClose={() => setIsEditingIcon(false)}
        />
      )}
    </div>
  );
};

