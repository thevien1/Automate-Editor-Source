import React from 'react';
import { ActionPropsCommon } from '../types';
import { CommonActionFooter } from '../CommonActionFooter';

export const GetExtensionIdProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  return (
    <div className="space-y-4">
      {/* Extension Name */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Extension Name
        </label>
        <input
          type="text"
          value={getRawVal('EXTENSION_NAME', '')}
          onChange={(e) => handleRawInputByKey('EXTENSION_NAME', e.target.value)}
          placeholder=""
          className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
        />
      </div>

      {/* Output Variable Name */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Output Variable Name
        </label>
        <input
          type="text"
          value={actionNode.output_variable_name || ''}
          onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
          placeholder=""
          className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
        />
      </div>

      {/* Common Footer (Delay, Continue on error, Note) */}
      <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
    </div>
  );
};
