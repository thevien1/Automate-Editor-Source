import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const MouseTryClickProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const clickTypeRaw = getRawVal('CLICK_TYPE', 'Click by Xpath');
  const clickType =
    clickTypeRaw === 'CLICK_POS' || clickTypeRaw === 'Click by coordinates'
      ? 'Click by coordinates'
      : clickTypeRaw === 'CLICK_CURRENT_POS' || clickTypeRaw === 'Click by current position' || clickTypeRaw === 'Click current position'
      ? 'Click by current position'
      : 'Click by Xpath';

  const handleTypeChange = (val: string) => {
    let typeVal = 'Click by Xpath';
    if (val === 'Click by coordinates') typeVal = 'Click by coordinates';
    if (val === 'Click by current position') typeVal = 'Click by current position';
    handleRawInputByKey('CLICK_TYPE', typeVal);
  };

  const handleXpathChange = (val: string) => {
    handleRawInputByKey('XPATH', val);
    updateNode(actionNode.id, { element_xpath: val });
  };

  return (
    <div className="space-y-4">
      {/* 1. Click Type */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Click Type
        </label>
        <div className="relative">
          <select
            value={clickType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer appearance-none pr-8"
          >
            <option value="Click by Xpath">Click by Xpath</option>
            <option value="Click by current position">Click by current position</option>
            <option value="Click by coordinates">Click by coordinates</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
            ▾
          </div>
        </div>
      </div>

      {/* 2. Conditional: XPath if Click by Xpath */}
      {clickType === 'Click by Xpath' && (
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            XPath
          </label>
          <VariableInput
            value={actionNode.element_xpath || getRawVal('XPATH', '')}
            onChange={handleXpathChange}
            placeholder='//button[@id="send-code"]'
          />
        </div>
      )}

      {/* 2. Conditional: Coordinates if Click by coordinates */}
      {clickType === 'Click by coordinates' && (
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Coordinates (X,Y)
          </label>
          <VariableInput
            value={getRawVal('POS', '')}
            onChange={(val) => handleRawInputByKey('POS', val)}
            placeholder="e.g. 900,800 or $pos"
          />
        </div>
      )}

      {/* 3. Number of tries */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Number of tries
        </label>
        <VariableInput
          value={getRawVal('NUMBER_OF_TRIES', '5')}
          onChange={(val) => handleRawInputByKey('NUMBER_OF_TRIES', val)}
          placeholder="5"
        />
      </div>

      {/* 4. Delay each click (s) */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Delay each click (s)
        </label>
        <VariableInput
          value={getRawVal('DELAY_EACH_CLICK', '2')}
          onChange={(val) => handleRawInputByKey('DELAY_EACH_CLICK', val)}
          placeholder="2"
        />
      </div>

      {/* 5. Stop Condition */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Stop Condition
        </label>
        <VariableInput
          value={getRawVal('STOP_CONDITION', '')}
          onChange={(val) => handleRawInputByKey('STOP_CONDITION', val)}
          placeholder='hasElement(//input[@id="otp-input"])'
        />
        <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] mt-1">
          Ví dụ: hasElement(//input[@id="otp-input"]) hoặc !hasElement(//div[@class="loading"])
        </p>
      </div>

      <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
    </div>
  );
};
