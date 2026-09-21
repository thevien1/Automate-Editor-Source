import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const MouseMoveProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const moveTypeRaw = getRawVal('MOVE_TYPE', 'Move by Xpath');
  const moveType =
    moveTypeRaw === 'MOVE_POS' || moveTypeRaw === 'Move by position' || moveTypeRaw === 'Move by coordinates'
      ? 'Move by coordinates'
      : 'Move by Xpath';

  const handleTypeChange = (val: string) => {
    handleRawInputByKey('MOVE_TYPE', val);
  };

  const handleXpathChange = (val: string) => {
    handleRawInputByKey('XPATH', val);
    updateNode(actionNode.id, { element_xpath: val });
  };

  return (
    <div className="space-y-4">
      {/* Move Type */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Move Type
        </label>
        <div className="relative">
          <select
            value={moveType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer appearance-none pr-8"
          >
            <option value="Move by Xpath">Move by Xpath</option>
            <option value="Move by coordinates">Move by coordinates</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
            ▾
          </div>
        </div>
      </div>

      {/* Conditional: XPath if Move by Xpath */}
      {moveType === 'Move by Xpath' && (
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

      {/* Conditional: Position if Move by coordinates */}
      {moveType === 'Move by coordinates' && (
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
