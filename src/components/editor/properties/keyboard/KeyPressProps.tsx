import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const KeyPressProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const rawType = getRawVal('TYPE', 'Text');
  const keyPressType =
    rawType === 'Single' || rawType === 'Single key'
      ? 'Single key'
      : rawType === 'Combo' || rawType === 'Combo key'
      ? 'Combo key'
      : 'Text';

  return (
    <div className="space-y-4">
      {/* XPath */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          XPath
        </label>
        <VariableInput
          value={actionNode.element_xpath || getRawVal('XPATH', '')}
          onChange={(val) => {
            handleRawInputByKey('XPATH', val);
            updateNode(actionNode.id, { element_xpath: val });
          }}
          placeholder=""
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Type
        </label>
        <div className="relative">
          <select
            value={keyPressType}
            onChange={(e) => handleRawInputByKey('TYPE', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer appearance-none pr-8"
          >
            <option value="Text">Text</option>
            <option value="Single key">Single key</option>
            <option value="Combo key">Combo key</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Key - Multi-line Textarea matching image */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Key
        </label>
        <VariableInput
          multiline={true}
          rows={5}
          value={getRawVal('KEY', '')}
          onChange={(val) => handleRawInputByKey('KEY', val)}
          placeholder=""
        />
      </div>

      {/* Delay each character */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5 leading-snug">
          Delay each character (ms). Enter -1 if you want to use emojis with character errors
        </label>
        <VariableInput
          value={getRawVal('DELAY_PRESS', '') || getRawVal('DELAY_EACH_CHAR', '')}
          onChange={(val) => handleRawInputByKey('DELAY_PRESS', val)}
          placeholder=""
        />
      </div>

      <CommonActionFooter
        actionNode={actionNode}
        updateNode={updateNode}
        delayLabel="Delay after completion (ms) (min,max)"
        defaultDelay="0,0"
      />
    </div>
  );
};
