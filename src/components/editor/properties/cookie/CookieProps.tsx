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
  // Support both 'FILE_PATH' and 'COOKIE_FILE' keys
  const cookieFileVal = getRawVal('FILE_PATH', getRawVal('COOKIE_FILE', ''));

  const handleChange = (val: string) => {
    handleRawInputByKey('FILE_PATH', val);
    handleRawInputByKey('COOKIE_FILE', val);
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
