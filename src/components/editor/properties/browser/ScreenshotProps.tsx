import React from 'react';
import { ActionPropsCommon } from '../types';
import { CommonActionFooter } from '../CommonActionFooter';
import { VariableInput } from '../../../common/VariableInput';

export const ScreenshotProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const isFullPage = getRawVal('FULL_PAGE', 'false') === 'true';

  return (
    <div className="space-y-4">
      {/* Output path */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Output path
        </label>
        <VariableInput
          value={getRawVal('OUTPUT_PATH', getRawVal('FOLDER_PATH', ''))}
          onChange={(val) => {
            handleRawInputByKey('OUTPUT_PATH', val);
          }}
          browseType="folder"
          placeholder=""
        />
      </div>

      {/* File name */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          File name
        </label>
        <input
          type="text"
          value={getRawVal('FILE_NAME', '')}
          onChange={(e) => handleRawInputByKey('FILE_NAME', e.target.value)}
          placeholder=""
          className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
        />
      </div>

      {/* Full page Checkbox */}
      <div>
        <div className="flex items-center space-x-2 pt-0.5">
          <input
            type="checkbox"
            id={`full_page_${actionNode.id}`}
            checked={isFullPage}
            onChange={(e) => handleRawInputByKey('FULL_PAGE', e.target.checked ? 'true' : 'false')}
            className="w-3.5 h-3.5 rounded border-[#d9d9d9] dark:border-[#1e293b] text-[#1677ff] focus:ring-[#1677ff] cursor-pointer"
          />
          <label
            htmlFor={`full_page_${actionNode.id}`}
            className="text-xs text-[#1e293b] dark:text-[#f1f5f9] select-none cursor-pointer"
          >
            Full page
          </label>
        </div>
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
