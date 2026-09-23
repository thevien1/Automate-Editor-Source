import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const CookieProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const name = actionNode.display_text?.toLowerCase() || '';
  const type = actionNode.type;
  const isClear = name.includes('clear') || name.includes('xóa') || type === 185;

  if (isClear) {
    const domainVal = getRawVal('DOMAIN', '');
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Domain (tùy chọn)
          </label>
          <VariableInput
            value={domainVal}
            onChange={(val) => handleRawInputByKey('DOMAIN', val)}
            placeholder="Để trống để xóa tất cả cookies"
          />
          <p className="mt-1 text-[10px] text-[#64748b] dark:text-[#94a3b8]">
            Để trống để xóa sạch toàn bộ cookies của trình duyệt. Hoặc điền domain (vd: facebook.com) để chỉ xóa cookie của trang đó.
          </p>
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // Read FILE_PATH (or fallback to COOKIE_FILE)
  const cookieFileVal = getRawVal('FILE_PATH') || getRawVal('COOKIE_FILE') || '';

  const handleChange = (val: string) => {
    handleRawInputByKey('FILE_PATH', val);
  };

  return (
    <div className="space-y-4">
      {/* Cookie file field matching GPM official design */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Cookie file
        </label>
        <VariableInput
          value={cookieFileVal}
          onChange={handleChange}
          browseType="file"
          placeholder=""
        />
      </div>

      {/* Common Footer: Delay after completion (ms) (min,max), Continue on error, Note */}
      <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
    </div>
  );
};
