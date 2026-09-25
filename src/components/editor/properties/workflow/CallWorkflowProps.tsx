import React from 'react';
import { ActionPropsCommon } from '../types';
import { useProject } from '../../../../context/ProjectContext';

export const CallWorkflowProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const { currentProject } = useProject();

  const selectedRef = getRawVal('REFERENCE_FILE', '');
  const subWorkflows = currentProject?.subWorkflows || {};
  const subWorkflowNames = Object.keys(subWorkflows);

  return (
    <div className="space-y-4 text-left">
      {/* Reference file dropdown */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Reference file
        </label>
        <div className="relative">
          <select
            value={selectedRef}
            onChange={(e) => handleRawInputByKey('REFERENCE_FILE', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer appearance-none pr-8"
          >
            <option value="" disabled className="text-gray-400">
              -- Select workflow file --
            </option>
            {subWorkflowNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {selectedRef && !subWorkflowNames.includes(selectedRef) && (
              <option value={selectedRef}>{selectedRef}</option>
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#64748b] dark:text-[#94a3b8]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
            </svg>
          </div>
        </div>
        {subWorkflowNames.length === 0 && (
          <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
            Chưa có workflow phụ. Hãy nhấn dấu + ở thanh tab bên trên để tạo workflow mới.
          </p>
        )}
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
      </div>

      {/* Note */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Note
        </label>
        <textarea
          value={actionNode.comment || ''}
          onChange={(e) => updateNode(actionNode.id, { comment: e.target.value })}
          placeholder="Quick note about this action — visible only in the editor, does not affect runtime"
          rows={3}
          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none resize-y"
        />
      </div>
    </div>
  );
};
