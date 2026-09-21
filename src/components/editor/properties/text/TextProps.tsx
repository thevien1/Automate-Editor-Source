import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const TextProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const type = actionNode.type;
  const name = actionNode.display_text?.toLowerCase() || '';

  const isRandomText = name === 'random text' || type === 8;
  const isSplitText = name === 'split text' || type === 9;
  const isReadJson = name === 'read json' || type === 10;
  const isRegex = name === 'regex' || type === 82;
  const isRandomNumber = name === 'random number' || type === 11;
  const isMathExecute = name === 'math execute' || type === 12;
  const is2FACode = name === '2fa code' || type === 81;

  // RANDOM TEXT ACTION
  if (isRandomText) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Text Length
          </label>
          <VariableInput
            value={getRawVal('TEXT_LEN', '')}
            onChange={(val) => handleRawInputByKey('TEXT_LEN', val)}
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

  // SPLIT TEXT ACTION
  if (isSplitText) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Input Text
          </label>
          <VariableInput
            value={getRawVal('INPUT_TEXT', '')}
            onChange={(val) => handleRawInputByKey('INPUT_TEXT', val)}
            placeholder="e.g. $txt_line or user1|pass123|key2fa"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Separator Character
          </label>
          <VariableInput
            value={getRawVal('SPLIT_CHAR', '')}
            onChange={(val) => handleRawInputByKey('SPLIT_CHAR', val)}
            placeholder="e.g. | or , or \t"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8]">
              Output Variable Name
            </label>
            <span className="text-[10px] text-[#1677ff] dark:text-[#38bdf8]">Supports multiple variables</span>
          </div>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder="e.g. email, password, code_2fa, url"
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
          <div className="mt-1.5 p-2 rounded bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-[#475569] dark:text-[#cbd5e1] space-y-1">
            <div className="font-semibold text-[#1677ff] dark:text-[#38bdf8]">💡 Cách gán biến tự động:</div>
            <div>• Nhập nhiều biến: <code className="text-[#1677ff] dark:text-[#38bdf8] font-mono">email, password, code_2fa, url</code> sẽ tự tách vào <code className="font-mono text-emerald-600 dark:text-emerald-400">$email</code>, <code className="font-mono text-emerald-600 dark:text-emerald-400">$password</code>, <code className="font-mono text-emerald-600 dark:text-emerald-400">$code_2fa</code>...</div>
            <div>• Hoặc nhập 1 biến: <code className="text-[#1677ff] dark:text-[#38bdf8] font-mono">account</code> sẽ truy xuất qua <code className="font-mono text-emerald-600 dark:text-emerald-400">$account_1</code>, <code className="font-mono text-emerald-600 dark:text-emerald-400">$account_2</code>...</div>
          </div>
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // READ JSON ACTION
  if (isReadJson) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Json text
          </label>
          <VariableInput
            value={getRawVal('JSON', '')}
            onChange={(val) => handleRawInputByKey('JSON', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Nodes
          </label>
          <VariableInput
            value={getRawVal('NODES', '')}
            onChange={(val) => handleRawInputByKey('NODES', val)}
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

  // REGEX ACTION
  if (isRegex) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Text
          </label>
          <VariableInput
            value={getRawVal('TEXT', '')}
            onChange={(val) => handleRawInputByKey('TEXT', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Regex
          </label>
          <VariableInput
            value={getRawVal('REGEX', '')}
            onChange={(val) => handleRawInputByKey('REGEX', val)}
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

  // RANDOM NUMBER ACTION
  if (isRandomNumber) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Min
          </label>
          <VariableInput
            value={getRawVal('MIN', '')}
            onChange={(val) => handleRawInputByKey('MIN', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Max
          </label>
          <VariableInput
            value={getRawVal('MAX', '')}
            onChange={(val) => handleRawInputByKey('MAX', val)}
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

  // MATH EXECUTE ACTION
  if (isMathExecute) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Math Expression
          </label>
          <VariableInput
            value={getRawVal('MATH_EXPRESSION', '')}
            onChange={(val) => handleRawInputByKey('MATH_EXPRESSION', val)}
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

  // 2FA CODE ACTION
  if (is2FACode) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Secret Key
          </label>
          <VariableInput
            value={getRawVal('SECRETE_KEY', '')}
            onChange={(val) => handleRawInputByKey('SECRETE_KEY', val)}
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
