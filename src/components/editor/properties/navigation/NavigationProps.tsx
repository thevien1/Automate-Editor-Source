import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const NavigationProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const name = actionNode.display_text?.toLowerCase() || '';
  const type = actionNode.type;

  // New tab
  if (name === 'new tab' || type === 36) {
    return (
      <div className="space-y-4">
        <CommonActionFooter
          actionNode={actionNode}
          updateNode={updateNode}
          delayLabel="Delay after completion (ms) [min,max]"
        />
      </div>
    );
  }

  // Active tab
  if (name === 'active tab' || type === 37) {
    const activeTabTypeRaw = getRawVal('ACTIVE_TAB_TYPE', 'By index');
    const activeTabType =
      activeTabTypeRaw === 'BY_PREFIX_URL' || activeTabTypeRaw === 'By Prefix Url'
        ? 'By Prefix Url'
        : 'By index';
    const activeTabTarget = getRawVal('TAB_INDEX_OR_PREFIX_URL', '');

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Active mode
          </label>
          <div className="relative">
            <select
              value={activeTabType}
              onChange={(e) => handleRawInputByKey('ACTIVE_TAB_TYPE', e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer appearance-none pr-8"
            >
              <option value="By index">By index</option>
              <option value="By Prefix Url">By Prefix Url</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
              ▾
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
          Tab index or Prefix Url. Tab index may differ from the order shown in the UI across browser versions. Prefix URL is recommended instead.
        </div>

        <div>
          <VariableInput
            value={activeTabTarget}
            onChange={(val) => handleRawInputByKey('TAB_INDEX_OR_PREFIX_URL', val)}
            placeholder=""
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

  // Close tab
  if (name === 'close tab' || type === 38) {
    return (
      <div className="space-y-4">
        <CommonActionFooter
          actionNode={actionNode}
          updateNode={updateNode}
          delayLabel="Delay after completion (ms) [min,max]"
        />
      </div>
    );
  }

  // Close all tab
  if (name === 'close all tab' || type === 73) {
    return (
      <div className="space-y-4">
        <CommonActionFooter
          actionNode={actionNode}
          updateNode={updateNode}
          delayLabel="Delay after completion (ms) [min,max]"
        />
      </div>
    );
  }

  // Go to URL
  if (name === 'go to url' || type === 39) {
    const gotoUrl = getRawVal('URL', '');
    const gotoTimeout = getRawVal('TIME_OUT', '60');

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            URL
          </label>
          <VariableInput
            value={gotoUrl}
            onChange={(val) => handleRawInputByKey('URL', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Timeout (s)
          </label>
          <VariableInput
            value={gotoTimeout}
            onChange={(val) => handleRawInputByKey('TIME_OUT', val)}
            placeholder="60"
          />
          <p className="mt-1.5 text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            Thời gian chờ trang tải tối đa (giây). Mặc định 60s. Khi dùng Proxy chậm nên tăng lên 120s (2 phút); hoặc giảm xuống 20s - 30s để ngắt luồng lỗi nhanh hơn khi gặp trang web chết (die).
          </p>
        </div>

        <CommonActionFooter
          actionNode={actionNode}
          updateNode={updateNode}
          delayLabel="Delay after completion (ms) [min,max]"
        />
      </div>
    );
  }

  // Wait URL changed
  if (name === 'wait url changed' || type === 43) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Current URL
          </label>
          <VariableInput
            value={getRawVal('CURRENT_URL')}
            onChange={(val) => handleRawInputByKey('CURRENT_URL', val)}
            placeholder=""
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Timeout (s)
          </label>
          <input
            type="text"
            value={getRawVal('TIME_OUT', '30')}
            onChange={(e) => handleRawInputByKey('TIME_OUT', e.target.value)}
            placeholder="30"
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>
        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // Reload (type 41)
  if (name === 'reload' || name === 'reload page' || type === 41) {
    return (
      <div className="space-y-4">
        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // Back URL (type 40)
  if (name === 'back url' || type === 40) {
    return (
      <div className="space-y-4">
        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // Get URL (type 42)
  if (name === 'get url' || name === 'get current url' || type === 42) {
    return (
      <div className="space-y-4">
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
