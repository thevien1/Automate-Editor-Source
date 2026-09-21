import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const ElementProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const type = actionNode.type;
  const name = actionNode.display_text?.toLowerCase() || '';

  const isWaitElement = name === 'wait element' || type === 44;
  const isGetElementAttribute = name === 'get element attribute' || type === 45;
  const isGetElementText = name === 'get element text' || type === 46;
  const isCountElement = name === 'count element' || type === 47;

  // Wait Element
  if (isWaitElement) {
    const waitTimeout = getRawVal('TIME_OUT', '20');

    return (
      <div className="space-y-4">
        {/* XPath */}
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            XPath
          </label>
          <VariableInput
            value={actionNode.element_xpath || ''}
            onChange={(val) => updateNode(actionNode.id, { element_xpath: val })}
            placeholder=""
          />
        </div>

        {/* Timeout (s) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8]">
              Timeout (s)
            </label>
            <span className="text-[10px] text-[#94a3b8]">Đơn vị: Giây (s)</span>
          </div>
          <input
            type="text"
            value={waitTimeout}
            onChange={(e) => handleRawInputByKey('TIME_OUT', e.target.value)}
            placeholder="20"
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
          <p className="mt-1 text-[10px] text-[#64748b] dark:text-[#94a3b8]">
            Thời gian tối đa chờ phần tử xuất hiện (khuyến nghị 10 - 20s). Lưu ý: 300 = 300 giây (5 phút).
          </p>
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // Get Element Attribute
  if (isGetElementAttribute) {
    const attrName = getRawVal('ATTR_NAME', '');

    return (
      <div className="space-y-4">
        {/* XPath */}
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            XPath
          </label>
          <VariableInput
            value={actionNode.element_xpath || ''}
            onChange={(val) => updateNode(actionNode.id, { element_xpath: val })}
            placeholder=""
          />
        </div>

        {/* Attribute name */}
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Attribute name
          </label>
          <VariableInput
            value={attrName}
            onChange={(val) => handleRawInputByKey('ATTR_NAME', val)}
            placeholder=""
          />
        </div>

        {/* Output Variable Name */}
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

  // Get Element Text
  if (isGetElementText) {
    return (
      <div className="space-y-4">
        {/* XPath */}
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            XPath
          </label>
          <VariableInput
            value={actionNode.element_xpath || ''}
            onChange={(val) => updateNode(actionNode.id, { element_xpath: val })}
            placeholder=""
          />
        </div>

        {/* Output Variable Name */}
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

  // Count Element
  if (isCountElement) {
    return (
      <div className="space-y-4">
        {/* XPath */}
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            XPath
          </label>
          <VariableInput
            value={actionNode.element_xpath || ''}
            onChange={(val) => updateNode(actionNode.id, { element_xpath: val })}
            placeholder=""
          />
        </div>

        {/* Output Variable Name */}
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
