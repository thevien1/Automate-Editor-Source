import React, { useState, useEffect } from 'react';
import { X, Code2, Copy, Check, Download, ClipboardPaste, Sparkles, CheckCircle2, AlertTriangle } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';
import { normalizeWorkflowNodes, nodesToJsonString, nodesToJsCodeString, filterOutDescendants } from '../../utils/jsonWorkflowUtils';
import { WorkflowNode } from '../../types/gscript';

interface JsonCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'export' | 'import';
}

export const JsonCodeModal: React.FC<JsonCodeModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'export',
}) => {
  const {
    currentProject,
    selectedNodeId,
    selectedNodeIds,
    selectedBlockKey,
    getSelectedNode,
    insertNodesFromJson,
    showToast,
  } = useProject();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialMode);
  const [exportScope, setExportScope] = useState<'selected' | 'main_logic' | 'before_init' | 'after_quit' | 'full'>('selected');
  const [exportFormat, setExportFormat] = useState<'json' | 'code'>('json');
  const [copied, setCopied] = useState(false);

  // Import state
  const [importText, setImportText] = useState('');
  const [importTargetBlock, setImportTargetBlock] = useState<'before_init' | 'main_logic' | 'after_quit'>(selectedBlockKey || 'main_logic');
  const [parsedNodes, setParsedNodes] = useState<WorkflowNode[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setCopied(false);
      setImportTargetBlock(selectedBlockKey || 'main_logic');
    }
  }, [isOpen, initialMode, selectedBlockKey]);

  // Compute export code based on scope
  const getExportData = () => {
    if (!currentProject) return '';

    let targetNodes: WorkflowNode[] = [];

    if (exportScope === 'selected') {
      const selected = getSelectedNode();
      if (selectedNodeIds.length > 1) {
        // Collect all nodes in flat tree order
        const all: WorkflowNode[] = [];
        const traverse = (node: WorkflowNode) => {
          if (!node) return;
          all.push(node);
          if ('nodes' in node && Array.isArray((node as any).nodes)) {
            for (const ch of (node as any).nodes) traverse(ch);
          }
        };
        if (currentProject.script.before_init) traverse(currentProject.script.before_init);
        if (currentProject.script.main_logic) traverse(currentProject.script.main_logic);
        if (currentProject.script.after_quit) traverse(currentProject.script.after_quit);

        const roots = [
          currentProject.script.before_init.id,
          currentProject.script.main_logic.id,
          currentProject.script.after_quit.id,
        ];
        const matched = all.filter((n) => selectedNodeIds.includes(n.id) && !roots.includes(n.id));
        targetNodes = filterOutDescendants(matched);
      } else if (selected) {
        targetNodes = [selected];
      } else {
        targetNodes = currentProject.script[selectedBlockKey].nodes;
      }
    } else if (exportScope === 'main_logic') {
      targetNodes = currentProject.script.main_logic.nodes;
    } else if (exportScope === 'before_init') {
      targetNodes = currentProject.script.before_init.nodes;
    } else if (exportScope === 'after_quit') {
      targetNodes = currentProject.script.after_quit.nodes;
    } else if (exportScope === 'full') {
      return JSON.stringify(currentProject.script, null, 2);
    }

    if (exportFormat === 'code') {
      return nodesToJsCodeString(targetNodes);
    }

    return nodesToJsonString(targetNodes, true);
  };

  const exportCode = getExportData();

  // Validate import text whenever it changes
  useEffect(() => {
    if (!importText.trim()) {
      setParsedNodes([]);
      setParseError(null);
      return;
    }

    try {
      const nodes = normalizeWorkflowNodes(importText.trim(), true);
      if (nodes.length > 0) {
        setParsedNodes(nodes);
        setParseError(null);
      } else {
        setParsedNodes([]);
        setParseError('Không nhận diện được node hợp lệ trong chuỗi JSON');
      }
    } catch (err: any) {
      setParsedNodes([]);
      setParseError(err.message || 'Cú pháp JSON không hợp lệ');
    }
  }, [importText]);

  if (!isOpen) return null;

  const handleCopyExport = async () => {
    if (!exportCode) return;
    if ((window as any).electronAPI?.fileAction) {
      try {
        await (window as any).electronAPI.fileAction({ action: 'setClipboard', payload: { text: exportCode } });
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(exportCode);
    } catch {}
    setCopied(true);
    showToast('Copy JSON', 'Đã sao chép vào clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasteFromClipboard = async () => {
    let text = '';
    if ((window as any).electronAPI?.fileAction) {
      try {
        const res = await (window as any).electronAPI.fileAction({ action: 'getClipboard' });
        if (res?.success && typeof res.text === 'string' && res.text.trim()) {
          text = res.text.trim();
        }
      } catch {}
    }
    if (!text) {
      try {
        text = await navigator.clipboard.readText();
      } catch {}
    }
    if (text) {
      setImportText(text);
    } else {
      alert('Vui lòng cấp quyền truy cập clipboard hoặc dán thủ công bằng phím Ctrl+V');
    }
  };

  const handleImport = () => {
    if (parsedNodes.length === 0) return;

    const res = insertNodesFromJson(importText, importTargetBlock);
    if (res.success) {
      showToast('Paste JSON', `Đã thêm ${res.count} node vào workflow!`);
      onClose();
    } else {
      setParseError(res.error || 'Có lỗi xảy ra khi thêm node');
    }
  };

  const handleDownloadJson = () => {
    if (!exportCode) return;
    const blob = new Blob([exportCode], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_${exportScope}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 select-none p-4 text-left animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#1e293b] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Top Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#e2e8f0] dark:border-[#1a2538] bg-[#f8fafc] dark:bg-[#080d19] text-xs text-[#64748b] dark:text-[#94a3b8]">
          <div className="flex items-center space-x-2 font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
            <div className="w-4 h-4 rounded bg-[#6366f1] text-white flex items-center justify-center font-bold text-[10px]">
              {'{ }'}
            </div>
            <span>JSON Code Transfer & Editor</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94a3b8] hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Header & Tabs */}
        <div className="p-4 pb-0 border-b border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#0c1220]">
          <div className="flex items-center justify-between pb-3">
            <div>
              <h2 className="text-base font-bold text-[#1e293b] dark:text-[#f8fafc] flex items-center space-x-2">
                <span>JSON Code & Node Transfer</span>
              </h2>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                Sao chép dạng JSON để dán vào code hoặc dán JSON từ code vào workflow.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 border-b border-transparent">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'export'
                  ? 'border-[#1677ff] text-[#1677ff] dark:text-[#38bdf8] bg-blue-50/50 dark:bg-blue-950/30 rounded-t-lg'
                  : 'border-transparent text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Xuất JSON (Copy / Export)</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'import'
                  ? 'border-[#1677ff] text-[#1677ff] dark:text-[#38bdf8] bg-blue-50/50 dark:bg-blue-950/30 rounded-t-lg'
                  : 'border-transparent text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Dán JSON vào Workflow (Import)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'export' ? (
            /* TAB 1: EXPORT JSON */
            <div className="space-y-3">
              {/* Controls row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Scope selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-[#64748b] dark:text-[#94a3b8]">Phạm vi:</span>
                  <select
                    value={exportScope}
                    onChange={(e) => setExportScope(e.target.value as any)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] cursor-pointer"
                  >
                    <option value="selected">Node đang chọn (Selected)</option>
                    <option value="main_logic">Toàn bộ Main logic</option>
                    <option value="before_init">Toàn bộ Before browser opened</option>
                    <option value="after_quit">Toàn bộ After browser closed</option>
                    <option value="full">Toàn bộ kịch bản (Full Script)</option>
                  </select>
                </div>

                {/* Format toggle */}
                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-[#0f172a] p-0.5 rounded-lg border border-[#cbd5e1] dark:border-[#1e293b]">
                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                      exportFormat === 'json'
                        ? 'bg-white dark:bg-[#1e293b] text-[#1677ff] dark:text-[#38bdf8] shadow-xs'
                        : 'text-[#64748b] dark:text-[#94a3b8]'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('code')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                      exportFormat === 'code'
                        ? 'bg-white dark:bg-[#1e293b] text-[#1677ff] dark:text-[#38bdf8] shadow-xs'
                        : 'text-[#64748b] dark:text-[#94a3b8]'
                    }`}
                  >
                    TypeScript / JS
                  </button>
                </div>
              </div>

              {/* Code display textarea */}
              <div className="relative">
                <textarea
                  readOnly
                  value={exportCode}
                  rows={14}
                  className="w-full p-3 font-mono text-xs bg-[#0b101d] text-[#38bdf8] border border-[#1e293b] rounded-xl focus:outline-none focus:border-[#38bdf8] select-all leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#1e293b] text-xs font-medium text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file .json</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyExport}
                  className="px-5 py-2 rounded-xl bg-[#1677ff] hover:bg-blue-600 text-white font-semibold text-xs flex items-center space-x-2 shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép vào Clipboard (Ctrl+C)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: IMPORT JSON */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#1e293b] dark:text-[#cbd5e1]">
                  Dán JSON của bạn vào đây:
                </label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1677ff] dark:text-[#38bdf8] text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center space-x-1.5 cursor-pointer border border-blue-200 dark:border-blue-900/40"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Dán từ Clipboard</span>
                </button>
              </div>

              {/* Paste Textarea */}
              <div className="relative">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`{\n  "$type": "GPMAutomateEditor.Models.ActionNode, GPMAutomateEditor.Models",\n  "type": 54,\n  "element_xpath": "//input[@name='q']",\n  "raw_input": "[{\\"Key\\":\\"TYPE\\",\\"Value\\":\\"Text\\"}]"\n}\n\nhoặc mảng [\n  { "type": 1, ... },\n  { "type": 2, ... }\n]`}
                  rows={12}
                  className="w-full p-3 font-mono text-xs bg-[#0b101d] text-[#f8fafc] border border-[#1e293b] rounded-xl focus:outline-none focus:border-[#38bdf8] leading-relaxed placeholder-[#475569]"
                />
              </div>

              {/* Target Block & Status */}
              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-[#0a0f1d] border border-[#e2e8f0] dark:border-[#1e293b] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-[#64748b] dark:text-[#94a3b8]">Thêm vào khối:</span>
                  <select
                    value={importTargetBlock}
                    onChange={(e) => setImportTargetBlock(e.target.value as any)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] cursor-pointer"
                  >
                    <option value="main_logic">Main logic</option>
                    <option value="before_init">Before browser opened</option>
                    <option value="after_quit">After browser closed</option>
                  </select>
                </div>

                {/* Validation Status */}
                <div>
                  {parsedNodes.length > 0 ? (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Hợp lệ: Sẵn sàng thêm {parsedNodes.length} node</span>
                    </span>
                  ) : parseError ? (
                    <span className="text-xs font-medium text-rose-500 dark:text-rose-400 flex items-center space-x-1.5 break-all max-w-full">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>{parseError}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[#94a3b8]">Chờ nhập dữ liệu JSON...</span>
                  )}
                </div>
              </div>

              {/* Import Button */}
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#cbd5e1] dark:border-[#1e293b] text-xs font-medium text-[#64748b] dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={parsedNodes.length === 0}
                  onClick={handleImport}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center space-x-2 shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Thêm {parsedNodes.length > 0 ? `(${parsedNodes.length}) ` : ''}vào Workflow</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
