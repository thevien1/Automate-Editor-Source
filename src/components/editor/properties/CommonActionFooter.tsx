import React from 'react';
import { ActionNode } from '../../../types/gscript';

interface CommonActionFooterProps {
  actionNode: ActionNode;
  updateNode: (id: string, updates: Partial<ActionNode>) => void;
  delayLabel?: string;
  defaultDelay?: string;
}

export const CommonActionFooter: React.FC<CommonActionFooterProps> = ({
  actionNode,
  updateNode,
  delayLabel = 'Delay after completion (ms) (min,max)',
  defaultDelay = '0,0',
}) => {
  return (
    <>
      {/* Delay after completion */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          {delayLabel}
        </label>
        <input
          type="text"
          value={actionNode.delay ?? defaultDelay}
          onChange={(e) => updateNode(actionNode.id, { delay: e.target.value })}
          placeholder={defaultDelay}
          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
        />
      </div>

      {/* Continue on error */}
      <div>
        <div className="flex items-center space-x-2 pt-0.5">
          <input
            type="checkbox"
            id={`continue_on_error_${actionNode.id}`}
            checked={actionNode.continue_on_error || false}
            onChange={(e) => updateNode(actionNode.id, { continue_on_error: e.target.checked })}
            className="rounded bg-white dark:bg-[#0f172a] border-[#d9d9d9] dark:border-[#1e293b] text-[#1677ff] dark:text-[#38bdf8] focus:ring-0 cursor-pointer"
          />
          <label
            htmlFor={`continue_on_error_${actionNode.id}`}
            className="text-xs font-medium text-[#334155] dark:text-[#cbd5e1] cursor-pointer"
          >
            Continue on error
          </label>
        </div>
        <p className="mt-0.5 pl-5 text-[10px] text-[#64748b] dark:text-[#94a3b8]">
          Nếu lỗi hoặc hết thời gian chờ, bỏ qua và tiếp tục hành động kế tiếp (không dừng profile)
        </p>
      </div>

      {/* Note */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Note
        </label>
        <textarea
          value={actionNode.comment || ''}
          onChange={(e) => updateNode(actionNode.id, { comment: e.target.value })}
          rows={5}
          placeholder="Quick note about this action — visible only in the editor, does not affect runtime"
          className="w-full px-3 py-2 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none resize-none placeholder-[#94a3b8]"
        />
      </div>
    </>
  );
};
