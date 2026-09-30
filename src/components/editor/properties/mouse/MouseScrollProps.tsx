import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const MouseScrollProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  return (
    <div className="space-y-4">
      {/* Number of scrolls */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Number of scrolls
        </label>
        <VariableInput
          value={getRawVal('SCROLL_NUM', '')}
          onChange={(val) => handleRawInputByKey('SCROLL_NUM', val)}
          placeholder="Ví dụ: 1 hoặc 2,5 (số dương cuộn xuống, số âm cuộn lên)"
        />
        <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] mt-1 leading-normal">
          Mô phỏng con lăn chuột mượt mà tự nhiên như người dùng thật. Nhập số dương (ví dụ: 2) để cuộn xuống, số âm (ví dụ: -2) để cuộn lên, hoặc khoảng ngẫu nhiên (ví dụ: 1,3).
        </div>
      </div>

      <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
    </div>
  );
};
