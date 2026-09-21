import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const MousePressHoldProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const pressTypeRaw = getRawVal('PRESS_TYPE', '');
  const rawPos = getRawVal('POS', '');
  const rawXPath = actionNode.element_xpath || getRawVal('XPATH', '');

  const pressType =
    pressTypeRaw === 'PRESS_POS' || pressTypeRaw === 'Press by coordinates' || (!rawXPath && rawPos)
      ? 'Press by coordinates'
      : 'Press by Xpath';

  const handleTypeChange = (val: string) => {
    handleRawInputByKey('PRESS_TYPE', val);
  };

  const handleXpathChange = (val: string) => {
    handleRawInputByKey('XPATH', val);
    updateNode(actionNode.id, { element_xpath: val });
  };

  return (
    <div className="space-y-4">
      {/* Press Type */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Press Type
        </label>
        <div className="relative">
          <select
            value={pressType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer appearance-none pr-8"
          >
            <option value="Press by Xpath">Press by Xpath</option>
            <option value="Press by coordinates">Press by coordinates</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
            ▾
          </div>
        </div>
      </div>

      {/* XPath if Press by Xpath */}
      {pressType === 'Press by Xpath' && (
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            XPath
          </label>
          <VariableInput
            value={actionNode.element_xpath || getRawVal('XPATH', '')}
            onChange={handleXpathChange}
            placeholder=""
          />
        </div>
      )}

      {/* Coordinates if Press by coordinates */}
      {pressType === 'Press by coordinates' && (
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Coordinates (x,y)
          </label>
          <VariableInput
            value={getRawVal('POS', '')}
            onChange={(val) => handleRawInputByKey('POS', val)}
            placeholder="e.g. 900,800 or $pos"
          />
        </div>
      )}

      <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
    </div>
  );
};
