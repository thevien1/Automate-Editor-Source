import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const SwitchProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const actType = actionNode.type;
  const actName = (actionNode.display_text || '').toLowerCase().trim();

  const isSwitchToFrame = actType === 62 || actName.includes('switch to frame');
  const isSwitchToPopup = actType === 63 || actName.includes('switch to popup');
  const isSwitchToDefault = actType === 61 || actName.includes('switch to default');

  return (
    <div className="space-y-4">
      {/* 1. Switch to frame: XPath */}
      {isSwitchToFrame && (
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
      )}

      {/* 2. Switch to popup: Popup Title */}
      {isSwitchToPopup && (
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Popup Title
          </label>
          <VariableInput
            value={getRawVal('TITLE', '') || getRawVal('POPUP_TITLE', '')}
            onChange={(val) => {
              handleRawInputByKey('TITLE', val);
              handleRawInputByKey('POPUP_TITLE', val);
            }}
            placeholder=""
          />
        </div>
      )}

      {/* Switch to default has no additional input fields */}

      {/* Common Footer matching Image 1, 2, 3: Delay after completion, Continue on error, Note */}
      <CommonActionFooter
        actionNode={actionNode}
        updateNode={updateNode}
        delayLabel="Delay after completion (ms) (min,max)"
        defaultDelay="0,0"
      />
    </div>
  );
};

export default SwitchProps;
