import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const VariableProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  rawInputs,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const name = actionNode.display_text?.toLowerCase() || '';
  const type = actionNode.type;

  // Set variable
  if (name === 'set variable' || type === 1) {
    const setVarValue = getRawVal('VALUE');
    const setVarAllowInput = getRawVal('ALLOW_USER_INPUT')?.toLowerCase() === 'true';

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Variable Value
          </label>
          <VariableInput
            value={setVarValue}
            onChange={(val) => handleRawInputByKey('VALUE', val)}
            placeholder=""
          />
        </div>

        <div className="flex items-center space-x-2 pt-0.5">
          <input
            type="checkbox"
            id={`allow_user_input_${actionNode.id}`}
            checked={setVarAllowInput}
            onChange={(e) => handleRawInputByKey('ALLOW_USER_INPUT', e.target.checked ? 'True' : 'False')}
            className="rounded bg-white dark:bg-[#0f172a] border-[#d9d9d9] dark:border-[#1e293b] text-[#1677ff] dark:text-[#38bdf8] focus:ring-0 cursor-pointer"
          />
          <label htmlFor={`allow_user_input_${actionNode.id}`} className="text-xs text-[#334155] dark:text-[#cbd5e1] cursor-pointer">
            Allow user input from the interface
          </label>
        </div>

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

        <CommonActionFooter
          actionNode={actionNode}
          updateNode={updateNode}
          delayLabel="Delay after completion (ms) [min,max]"
        />
      </div>
    );
  }

  // Increase variable
  if (name === 'increase variable' || type === 2) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Current Value
          </label>
          <VariableInput
            value={getRawVal('CURRENT_VAL')}
            onChange={(val) => handleRawInputByKey('CURRENT_VAL', val)}
            placeholder=""
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Increase by
          </label>
          <VariableInput
            value={getRawVal('INCREASE_BY')}
            onChange={(val) => handleRawInputByKey('INCREASE_BY', val)}
            placeholder=""
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || getRawVal('OUTPUT_VAR') || ''}
            onChange={(e) => {
              updateNode(actionNode.id, { output_variable_name: e.target.value });
              handleRawInputByKey('OUTPUT_VAR', e.target.value);
            }}
            placeholder="e.g. tangLenMot (Leave empty to update current variable)"
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>
        <CommonActionFooter
          actionNode={actionNode}
          updateNode={updateNode}
          delayLabel="Delay after completion (ms) [min,max]"
        />
      </div>
    );
  }

  // Decrease variable
  if (name === 'decrease variable' || type === 3) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Current Value
          </label>
          <VariableInput
            value={getRawVal('CURRENT_VAL')}
            onChange={(val) => handleRawInputByKey('CURRENT_VAL', val)}
            placeholder=""
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Decrease by
          </label>
          <VariableInput
            value={getRawVal('DESCREASE_BY')}
            onChange={(val) => handleRawInputByKey('DESCREASE_BY', val)}
            placeholder=""
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || getRawVal('OUTPUT_VAR') || ''}
            onChange={(e) => {
              updateNode(actionNode.id, { output_variable_name: e.target.value });
              handleRawInputByKey('OUTPUT_VAR', e.target.value);
            }}
            placeholder="e.g. giamXuongMot (Leave empty to update current variable)"
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>
        <CommonActionFooter
          actionNode={actionNode}
          updateNode={updateNode}
          delayLabel="Delay after completion (ms) [min,max]"
        />
      </div>
    );
  }

  // Count
  if (name === 'count' || type === 4) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Input array
          </label>
          <VariableInput
            value={getRawVal('INPUT_ARRAY')}
            onChange={(val) => handleRawInputByKey('INPUT_ARRAY', val)}
            placeholder=""
          />
        </div>
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
        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  return null;
};
