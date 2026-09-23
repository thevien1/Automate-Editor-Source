import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  Folder,
  Trash2,
  ChevronRight,
  SlidersHorizontal,
  Search,
  Check,
  Copy,
} from '../common/Icons';
import { ActionNode } from '../../types/gscript';
import { parseRawInput, serializeRawInput } from '../../utils/gpmUtils';

// Modular properties components
import { ActionHeader } from './properties/ActionHeader';
import { BlockProperties } from './properties/blocks/BlockProperties';
import { MouseMoveProps } from './properties/mouse/MouseMoveProps';
import { MousePressHoldProps } from './properties/mouse/MousePressHoldProps';
import { MouseReleaseProps } from './properties/mouse/MouseReleaseProps';
import { MouseScrollProps } from './properties/mouse/MouseScrollProps';
import { MouseClickProps } from './properties/mouse/MouseClickProps';
import { MouseTryClickProps } from './properties/mouse/MouseTryClickProps';
import { KeyPressProps } from './properties/keyboard/KeyPressProps';
import { FileUploadProps } from './properties/keyboard/FileUploadProps';
import { SelectDropdownProps } from './properties/keyboard/SelectDropdownProps';
import { VariableProps } from './properties/variable/VariableProps';
import { FlowProps } from './properties/flow/FlowProps';
import { NavigationProps } from './properties/navigation/NavigationProps';
import { ElementProps } from './properties/element/ElementProps';
import { TextProps } from './properties/text/TextProps';
import { FileFolderExcelProps } from './properties/file/FileFolderExcelProps';
import { HttpMailProps } from './properties/http/HttpMailProps';
import { SwitchProps } from './properties/navigation/SwitchProps';
import { CookieProps } from './properties/cookie/CookieProps';
import { GenericActionProps } from './properties/GenericActionProps';
import { VariablesPanel } from './VariablesPanel';

export const PropertyPanel: React.FC = () => {
  const {
    getSelectedNode,
    updateNode,
    deleteSelectedNode,
    copySelectedNode,
    duplicateSelectedNode,
    allVariables,
    selectedNodeIds = [],
  } = useProject();

  const [activeTab, setActiveTab] = useState<'property' | 'variables'>('property');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [varSearchTerm, setVarSearchTerm] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const selectedNode = getSelectedNode();
  const isBlock = selectedNode && 'nodes' in selectedNode;
  const isAction = selectedNode && !isBlock;
  const actionNode = isAction ? (selectedNode as ActionNode) : null;

  const rawInputs = parseRawInput(actionNode?.raw_input || null);

  const getRawVal = (key: string, fallback = '') =>
    rawInputs.find((p) => p.Key === key)?.Value ?? fallback;

  const handleRawInputByKey = (key: string, val: string) => {
    if (!actionNode) return;
    let updated = [...rawInputs];
    const idx = updated.findIndex((p) => p.Key === key);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], Value: val };
    } else {
      updated.push({ Key: key, Value: val });
    }
    updateNode(actionNode.id, { raw_input: serializeRawInput(updated) });
  };

  const handleRawInputChange = (index: number, val: string) => {
    if (!actionNode) return;
    const updated = [...rawInputs];
    updated[index].Value = val;
    updateNode(actionNode.id, { raw_input: serializeRawInput(updated) });
  };

  const copyVariable = (vName: string) => {
    const formatted = `$${vName}`;
    navigator.clipboard.writeText(formatted);
    setCopiedVar(vName);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  const filteredVars = allVariables.filter((v) =>
    v.toLowerCase().includes(varSearchTerm.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <div className="w-8 bg-white dark:bg-[#0b101d] border-l border-[#e2e8f0] dark:border-[#162236] flex flex-col items-center py-3 select-none transition-colors">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1 rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] hover:text-[#1e293b] dark:hover:text-[#cbd5e1] mb-4"
          title="Expand Panel"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <span
          className="text-[11px] font-medium text-[#64748b] tracking-wider uppercase whitespace-nowrap cursor-pointer select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          onClick={() => setIsCollapsed(false)}
        >
          {activeTab === 'variables' ? 'Variables' : 'Properties'}
        </span>
      </div>
    );
  }

  // Action routing renderer
  const renderActionProperties = () => {
    if (!actionNode) return null;

    const type = actionNode.type;
    const name = actionNode.display_text?.toLowerCase() || '';

    const commonProps = {
      actionNode,
      rawInputs,
      getRawVal,
      handleRawInputByKey,
      updateNode,
    };

    // Mouse Actions
    if (name === 'mouse move' || type === 50) return <MouseMoveProps {...commonProps} />;
    if (name === 'mouse press and hold' || type === 51) return <MousePressHoldProps {...commonProps} />;
    if (name === 'mouse release' || type === 52) return <MouseReleaseProps {...commonProps} />;
    if (name === 'mouse scroll' || type === 53) return <MouseScrollProps {...commonProps} />;
    if (name === 'mouse click' || type === 48) return <MouseClickProps {...commonProps} />;
    if (name === 'mouse try to click' || type === 49) return <MouseTryClickProps {...commonProps} />;

    // Keyboard Actions
    if (name === 'key press' || type === 54 || name.includes('key')) return <KeyPressProps {...commonProps} />;
    if (name === 'upload file' || type === 55) return <FileUploadProps {...commonProps} />;
    if (name.includes('select dropdown') || type === 111) return <SelectDropdownProps {...commonProps} />;

    // Variable Actions
    if (
      name === 'set variable' ||
      name.includes('increase') ||
      name.includes('decrease') ||
      name.includes('count') ||
      [1, 2, 3, 4].includes(type as number)
    ) {
      return <VariableProps {...commonProps} />;
    }

    // Flow Actions
    if (
      name.includes('exit loop') ||
      name.includes('next loop') ||
      name === 'stop' ||
      name === 'throw' ||
      name === 'delay' ||
      [5, 6, 76, 117, 7].includes(type as number)
    ) {
      return <FlowProps {...commonProps} />;
    }

    // Navigation Actions
    if (
      name === 'new tab' ||
      name === 'active tab' ||
      name === 'close tab' ||
      name === 'close all tab' ||
      name === 'go to url' ||
      name === 'reload' ||
      name === 'reload page' ||
      name.includes('reload') ||
      name === 'back url' ||
      name === 'get url' ||
      name === 'get current url' ||
      name.includes('wait url changed') ||
      [36, 37, 38, 73, 39, 40, 41, 42, 43].includes(type as number)
    ) {
      return <NavigationProps {...commonProps} />;
    }

    // Element Actions
    if (
      name === 'wait element' ||
      name === 'get element attribute' ||
      name === 'get element text' ||
      name === 'count element' ||
      [44, 45, 46, 47].includes(type as number)
    ) {
      return <ElementProps {...commonProps} />;
    }

    // Text Actions
    if (
      name === 'random text' ||
      name === 'split text' ||
      name === 'read json' ||
      name === 'regex' ||
      name === 'random number' ||
      name === 'math execute' ||
      name === '2fa code' ||
      [8, 9, 10, 82, 11, 12, 81].includes(type as number)
    ) {
      return <TextProps {...commonProps} />;
    }

    // File, Folder, Excel, Clipboard Actions
    if (
      [13, 14, 15, 16, 17, 18, 184, 19, 20, 74, 21, 22, 71, 23, 24, 26, 25, 72, 27, 28].includes(
        type as number
      ) ||
      name.includes('file') ||
      name.includes('folder') ||
      name.includes('excel') ||
      name.includes('clipboard')
    ) {
      return <FileFolderExcelProps {...commonProps} />;
    }

    // HTTP, Image, Mail Actions
    if (
      [29, 30, 107, 108, 109, 110, 35, 80].includes(type as number) ||
      name.includes('http') ||
      name.includes('image') ||
      name.includes('mail') ||
      name.includes('outlook')
    ) {
      return <HttpMailProps {...commonProps} />;
    }

    // Switch Actions (Switch to frame, Switch to default, Switch to popup)
    if (
      name.includes('switch to frame') ||
      name.includes('switch to default') ||
      name.includes('switch to popup') ||
      [61, 62, 63].includes(type as number)
    ) {
      return <SwitchProps {...commonProps} />;
    }

    // Cookie Actions (Import cookie, Export cookie)
    if (
      name.includes('import cookie') ||
      name.includes('export cookie') ||
      [64, 65].includes(type as number)
    ) {
      return <CookieProps {...commonProps} />;
    }

    // Fallback generic form
    return (
      <GenericActionProps
        actionNode={actionNode}
        rawInputs={rawInputs}
        handleRawInputChange={handleRawInputChange}
        updateNode={updateNode}
      />
    );
  };

  return (
    <div className="w-80 bg-white dark:bg-[#0b101d] border-l border-[#e2e8f0] dark:border-[#162236] flex flex-col h-full select-none transition-colors">
      {/* Top Tabs Bar */}
      <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-[#162236] px-2 pt-1 bg-[#fafafa] dark:bg-[#070b14]">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('property')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'property'
                ? 'border-[#1677ff] dark:border-[#38bdf8] text-[#1677ff] dark:text-[#38bdf8]'
                : 'border-transparent text-[#64748b] hover:text-[#1e293b] dark:hover:text-[#cbd5e1]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Property</span>
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'variables'
                ? 'border-[#1677ff] dark:border-[#38bdf8] text-[#1677ff] dark:text-[#38bdf8]'
                : 'border-transparent text-[#64748b] hover:text-[#1e293b] dark:hover:text-[#cbd5e1]'
            }`}
          >
            <span className="font-mono text-[11px] font-bold">{'{ }'}</span>
            <span>Variables</span>
            {allVariables.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f1f5f9] dark:bg-[#162236] text-[#64748b] font-normal">
                {allVariables.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] text-[#64748b] hover:text-[#1e293b] dark:hover:text-[#cbd5e1] mr-1"
          title="Collapse Panel"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 text-left">
        {activeTab === 'variables' ? (
          /* Variables Tab Content */
          <div className="h-full flex flex-col -m-4">
            <VariablesPanel showHeader={false} />
          </div>
        ) : selectedNodeIds.length > 1 ? (
          /* Multi-selection view */
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] dark:border-[#162236]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#e6f4ff] dark:bg-[#0e1e3b] border border-[#91caff] dark:border-[#1d4ed8]/40 flex items-center justify-center shadow-2xs">
                  <span className="font-bold text-xs text-[#1677ff] dark:text-[#38bdf8] font-mono">
                    {selectedNodeIds.length}x
                  </span>
                </div>
                <div>
                  <div className="font-bold text-sm text-[#1e293b] dark:text-[#f1f5f9]">
                    {selectedNodeIds.length} items selected
                  </div>
                  <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    Multi-selection active
                  </div>
                </div>
              </div>

              <button
                onClick={deleteSelectedNode}
                className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
                title="Delete Selected (Del)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#f8fafc] dark:bg-[#0c1424] border border-[#e2e8f0] dark:border-[#1a2840] rounded-lg p-3 text-xs text-[#64748b] dark:text-[#94a3b8] space-y-2">
              <div className="font-semibold text-[#1e293b] dark:text-[#f1f5f9]">Batch Actions</div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={copySelectedNode}
                  className="flex items-center justify-center space-x-2 w-full py-2 px-3 rounded-md bg-[#1677ff] hover:bg-[#4096ff] text-white font-medium text-xs shadow-xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy {selectedNodeIds.length} items (Ctrl+C)</span>
                </button>
                <button
                  onClick={duplicateSelectedNode}
                  className="flex items-center justify-center space-x-2 w-full py-2 px-3 rounded-md bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] hover:border-[#1677ff] dark:hover:border-[#38bdf8] font-medium text-xs transition-colors"
                >
                  <span>Duplicate {selectedNodeIds.length} items (Ctrl+D)</span>
                </button>
                <button
                  onClick={deleteSelectedNode}
                  className="flex items-center justify-center space-x-2 w-full py-2 px-3 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 font-medium text-xs border border-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete {selectedNodeIds.length} items (Del)</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 rounded-lg">
              <span className="font-semibold text-[#1677ff] dark:text-[#38bdf8]">Tip:</span> Giữ phím{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#0f172a] border border-gray-300 dark:border-gray-700 text-[10px] font-mono">
                Ctrl
              </kbd>{' '}
              hoặc{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#0f172a] border border-gray-300 dark:border-gray-700 text-[10px] font-mono">
                Shift
              </kbd>{' '}
              khi click để chọn nhiều action.
            </div>
          </div>
        ) : !selectedNode ? (
          /* Khi chưa chọn action nào: Hiển thị ngay bảng Variables ở cột bên phải */
          <div className="h-full flex flex-col -m-4">
            <VariablesPanel showHeader={true} title="System & Excel Variables" />
          </div>
        ) : (
          /* Property Form */
          <div className="space-y-4 text-left">
            <ActionHeader
              selectedNode={selectedNode}
              deleteSelectedNode={deleteSelectedNode}
            />

            {isBlock ? (
              <BlockProperties selectedNode={selectedNode} updateNode={updateNode} />
            ) : (
              renderActionProperties()
            )}
          </div>
        )}
      </div>
    </div>
  );
};
