import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle2, Palette, Code2 } from '../../common/Icons';
import { ActionIcon, getEffectiveCustomOverride } from '../../common/ActionIcon';
import { WorkflowNode, ActionNode } from '../../../types/gscript';
import { ActionIconEditorModal } from '../../modals/ActionIconEditorModal';
import { useProject } from '../../../context/ProjectContext';

interface ActionHeaderProps {
  selectedNode: WorkflowNode;
  deleteSelectedNode: () => void;
  headerIcon?: React.ReactNode;
}

export const ActionHeader: React.FC<ActionHeaderProps> = ({
  selectedNode,
  deleteSelectedNode,
  headerIcon,
}) => {
  const { setShowJsonModal, setJsonModalMode, showConfirmModal } = useProject();
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [, setVer] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setVer((v) => v + 1);
    window.addEventListener('gpm_custom_icons_updated', handleUpdate);
    return () => window.removeEventListener('gpm_custom_icons_updated', handleUpdate);
  }, []);

  const isFor = selectedNode.$type?.includes('ForBlockNode') || selectedNode.display_text?.toLowerCase() === 'for';
  const isWhile = selectedNode.$type?.includes('WhileBlockNode') || selectedNode.display_text?.toLowerCase() === 'while';
  const isElseIf = selectedNode.display_text?.toLowerCase().includes('else if');
  const isElse = selectedNode.display_text?.toLowerCase() === 'else';
  const isIf = !isElseIf && !isElse && (selectedNode.$type?.includes('IfBlockNode') || selectedNode.display_text?.toLowerCase().startsWith('if'));
  const isNormalBlock = !isFor && !isIf && !isWhile && !isElseIf && !isElse && ('nodes' in selectedNode);

  const isAction = !('nodes' in selectedNode);
  const actionNode = isAction ? (selectedNode as ActionNode) : null;

  const title = isFor
    ? 'For'
    : isWhile
    ? 'While'
    : isElseIf
    ? 'Else if'
    : isElse
    ? 'Else'
    : isIf
    ? (selectedNode.display_text || 'If')
    : isNormalBlock
    ? (selectedNode.display_text || 'Normal block')
    : (actionNode?.display_text || 'Action');

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

  const customOverride = getEffectiveCustomOverride(
    actionNode?.display_text || selectedNode.display_text,
    actionNode?.type,
    blockType
  );

  return (
    <>
      {/* Header: Rounded Icon + Title + Comment + Palette + Trash */}
      <div className="flex items-start justify-between pb-3 border-b border-[#e2e8f0] dark:border-[#162236]">
        <div className="flex items-center space-x-3">
          {/* Rounded Icon Box */}
          <div
            onClick={() => setIsEditingIcon(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs cursor-pointer transition-transform hover:scale-105"
            style={
              customOverride?.color
                ? {
                    backgroundColor: `${customOverride.color}18`,
                    border: `1px solid ${customOverride.color}45`,
                  }
                : undefined
            }
          >
            {headerIcon ? (
              headerIcon
            ) : (
              <ActionIcon
                actionName={actionNode?.display_text || selectedNode.display_text}
                actionType={actionNode?.type}
                blockType={blockType}
                className="w-6 h-6"
              />
            )}
          </div>
          <div>
            <div className="font-bold text-sm text-[#1e293b] dark:text-[#f1f5f9]">
              {title}
            </div>
            <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
              {selectedNode.comment ? selectedNode.comment : 'No comment'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setJsonModalMode('export');
              setShowJsonModal(true);
            }}
            className="p-1.5 rounded text-[#6366f1] hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
            title="Xem / Copy JSON của node này (Ctrl+C)"
          >
            <Code2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsEditingIcon(true)}
            className="p-1.5 rounded text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/20 transition-colors cursor-pointer"
            title="Tùy chỉnh màu & icon"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const hasChildren = 'nodes' in selectedNode && Array.isArray((selectedNode as any).nodes) && (selectedNode as any).nodes.length > 0;
              const nodeName = selectedNode.display_text || title;
              if (hasChildren) {
                const childCount = (selectedNode as any).nodes.length;
                showConfirmModal({
                  title: 'Delete Block',
                  subtitle: `Xóa khối "${nodeName}"`,
                  message: (
                    <span>
                      Khối <span className="text-red-500 font-semibold">{nodeName}</span> đang chứa <strong>{childCount}</strong> hành động con. Bạn có chắc chắn muốn xóa khối này cùng toàn bộ hành động bên trong không?
                    </span>
                  ),
                  confirmText: 'Delete',
                  cancelText: 'Hủy',
                  variant: 'danger',
                  itemName: nodeName,
                  itemType: `${childCount} child nodes`,
                  warningNote: 'Toàn bộ hành động con bên trong khối này sẽ bị xóa. Bạn có thể nhấn Ctrl+Z để hoàn tác nếu cần.',
                  onConfirm: () => {
                    deleteSelectedNode();
                  },
                });
              } else {
                deleteSelectedNode();
              }
            }}
            className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
            title="Delete Node (Del)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Auto-save enabled badge */}
      <div>
        <span className="bg-[#f0fdf4] dark:bg-[#052e16] text-[#16a34a] dark:text-[#4ade80] border border-[#bbf7d0] dark:border-[#166534] px-2.5 py-1 rounded-full text-[11px] font-medium inline-flex items-center space-x-1.5 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#4ade80]" />
          <span>Auto-save is enabled</span>
        </span>
      </div>

      {/* Modal chỉnh sửa Icon & Màu sắc */}
      {isEditingIcon && (
        <ActionIconEditorModal
          isOpen={isEditingIcon}
          actionName={
            isNormalBlock
              ? 'Normal block'
              : isFor
              ? 'for'
              : isWhile
              ? 'while'
              : isIf || isElseIf || isElse
              ? 'if'
              : actionNode?.display_text || 'Action'
          }
          actionType={actionNode?.type}
          onClose={() => setIsEditingIcon(false)}
        />
      )}
    </>
  );
};

export default ActionHeader;
