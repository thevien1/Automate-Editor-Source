import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  ClipboardPaste,
  CheckCircle2,
  Box,
  Play,
  FilePlus,
  AlertTriangle,
  Code2,
  ChevronDown,
  ChevronRight
} from '../common/Icons';
import { useProject } from '../../context/ProjectContext';
import { ActionIcon } from '../common/ActionIcon';
import { WorkflowNode, ActionNode } from '../../types/gscript';
import { buildCopilotStep2Prompt } from '../../utils/copilotPrompt';

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiCopilotModal: React.FC<AiCopilotModalProps> = ({ isOpen, onClose }) => {
  const {
    currentProject,
    activeWorkflowTab,
    setActiveWorkflowTab,
    createSubWorkflow,
    selectedBlockKey,
    insertNodesFromJson,
    showToast,
    aiPreviewData,
    setAiPreviewData,
  } = useProject();

  // Port state
  const [port, setPort] = useState<string>(() => {
    return localStorage.getItem('svb_debug_port') || localStorage.getItem('gpm_debug_port') || '53002';
  });
  const [detectingPort, setDetectingPort] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Target block / sub-workflow
  const [targetType, setTargetType] = useState<string>('main_logic');
  const [newSubWorkflowName, setNewSubWorkflowName] = useState<string>('');
  const [isCreatingNewBranch, setIsCreatingNewBranch] = useState<boolean>(false);

  // Preview & Generated nodes
  const [generatedNodes, setGeneratedNodes] = useState<WorkflowNode[]>([]);
  const [rawJsonOutput, setRawJsonOutput] = useState<string>('');
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Copy states
  const [copiedStep1, setCopiedStep1] = useState(false);
  const [copiedStep2, setCopiedStep2] = useState(false);
  const [copiedContext, setCopiedContext] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const skillServerUrl = 'http://localhost:8775';

  // Get current existing nodes
  const currentMainNodes = currentProject?.script?.main_logic?.nodes || [];
  const currentSubWorkflows = currentProject?.subWorkflows || {};
  const subWorkflowNames = Object.keys(currentSubWorkflows);

  // Auto-detect running port (queries GPMLogin/SV Browser local API on port 8725)
  const autoDetectPort = async (): Promise<string | null> => {
    setDetectingPort(true);
    try {
      const endpoints = [
        'http://127.0.0.1:8725/api/v1/profiles?per_page=100',
        'http://localhost:8725/api/v1/profiles?per_page=100',
        'http://127.0.0.1:8725/api/v3/profiles?per_page=100',
        'http://localhost:8725/api/v3/profiles?per_page=100',
      ];
      for (const ep of endpoints) {
        try {
          const resp = await fetch(ep, { signal: AbortSignal.timeout(1500) }).catch(() => null);
          if (resp && resp.ok) {
            const json = await resp.json();
            const list = json?.data?.data || json?.data?.profiles || (Array.isArray(json?.data) ? json.data : []);
            const running = list.find((p: any) =>
              (p.status === 'running' || p.port || p.remote_debugging_port || p.remote_debugging_address) &&
              (p.port || p.remote_debugging_port || p.remote_debugging_address)
            );
            const candidate = running?.port || running?.remote_debugging_port || running?.remote_debugging_address;
            if (candidate) {
              let portStr = String(candidate).trim();
              if (portStr.includes(':')) {
                portStr = portStr.split(':').pop() || portStr;
              }
              if (portStr && portStr !== '8725') {
                setPort(portStr);
                localStorage.setItem('gpm_debug_port', portStr);
                setDetectingPort(false);
                return portStr;
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
    setDetectingPort(false);
    return null;
  };

  // Check skill server status
  const checkServer = async () => {
    setServerStatus('checking');
    try {
      const res = await fetch(skillServerUrl, { signal: AbortSignal.timeout(1500) }).catch(() => null);
      if (res) {
        setServerStatus('online');
        return;
      }
    } catch (e) {}
    setServerStatus('offline');
  };

  useEffect(() => {
    if (isOpen) {
      const savedPort = localStorage.getItem('svb_debug_port') || localStorage.getItem('gpm_debug_port');
      if (savedPort) setPort(savedPort);
      setTargetType(selectedBlockKey || 'main_logic');
      checkServer();
      autoDetectPort();
    }
  }, [isOpen, selectedBlockKey]);

  // Đồng bộ dữ liệu AI tạo ra từ context vào khung xem trước
  useEffect(() => {
    if (aiPreviewData?.nodes && Array.isArray(aiPreviewData.nodes) && aiPreviewData.nodes.length > 0) {
      setGeneratedNodes(aiPreviewData.nodes);
      setRawJsonOutput(JSON.stringify(aiPreviewData.nodes, null, 2));
      if (aiPreviewData.target) {
        setTargetType(aiPreviewData.target);
      }
    }
  }, [aiPreviewData]);

  // Lắng nghe sự kiện AI gọi POST :8775/create để hiển thị preview ngay trong modal nếu đang mở
  useEffect(() => {
    if ((window as any).electronAPI?.onWorkflowAutoApply) {
      const unsub = (window as any).electronAPI.onWorkflowAutoApply((data: any) => {
        if (data?.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
          setGeneratedNodes(data.nodes);
          setRawJsonOutput(JSON.stringify(data.nodes, null, 2));
          if (data.target) {
            setTargetType(data.target);
          }
        }
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const cleanPort = port.trim() || '53002';

  // Build existing workflow summary JSON for AI context
  const getExistingWorkflowContext = () => {
    if (!currentProject) return null;
    const ctx: any = {
      main_logic: currentMainNodes,
    };
    if (subWorkflowNames.length > 0) {
      ctx.sub_workflows = {};
      for (const name of subWorkflowNames) {
        ctx.sub_workflows[name] = currentSubWorkflows[name]?.main_logic?.nodes || [];
      }
    }
    return ctx;
  };

  const existingContext = getExistingWorkflowContext();
  const hasExistingNodes = currentMainNodes.length > 0 || subWorkflowNames.length > 0;

  // Bước 1: Gửi cho AI đọc hiểu Skill & JSON Schema tại :8775 trước
  const promptStep1 = `Hãy đọc và nghiên cứu tài liệu skill, danh mục Action, cú pháp điều kiện và quy tắc cấu trúc JSON của SV Browser Automate Editor tại ${skillServerUrl}/. Sau đó hãy xác nhận bạn đã hiểu rõ quy tắc xây dựng workflow (.gscript) để tôi gửi yêu cầu tạo kịch bản.`;

  // Bước 2: Viết câu lệnh thao tác, yêu cầu AI tạo dạng POST http://localhost:8775/create
  const promptStep2 = buildCopilotStep2Prompt(cleanPort, targetType, skillServerUrl);

  const copyToClipboard = (text: string, type: 'step1' | 'step2' | 'link' | 'context') => {
    navigator.clipboard.writeText(text);
    if (type === 'step1') {
      setCopiedStep1(true);
      setTimeout(() => setCopiedStep1(false), 2000);
    } else if (type === 'step2') {
      setCopiedStep2(true);
      setTimeout(() => setCopiedStep2(false), 2000);
    } else if (type === 'context') {
      setCopiedContext(true);
      setTimeout(() => setCopiedContext(false), 2000);
    } else if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const openSkillUrl = () => {
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(skillServerUrl);
    } else {
      window.open(skillServerUrl, '_blank');
    }
  };

  // Parse pasted or typed raw JSON into preview nodes
  const handleRawJsonChange = (text: string) => {
    setRawJsonOutput(text);
    try {
      if (!text.trim()) {
        setGeneratedNodes([]);
        return;
      }
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setGeneratedNodes(parsed);
      } else if (parsed.nodes && Array.isArray(parsed.nodes)) {
        setGeneratedNodes(parsed.nodes);
      } else if (parsed.main_logic && parsed.main_logic.nodes) {
        setGeneratedNodes(parsed.main_logic.nodes);
      }
    } catch (e) {
      // JSON in progress
    }
  };

  // Apply nodes to current project / sub-workflow
  const handleApplyToWorkflow = async () => {
    const jsonToInsert = rawJsonOutput.trim() || JSON.stringify(generatedNodes);
    if (!jsonToInsert) {
      alert('Chưa có kịch bản để áp dụng!');
      return;
    }

    try {
      // If user wants to create a new branch / sub-workflow
      if (isCreatingNewBranch && newSubWorkflowName.trim()) {
        const branchRes = await createSubWorkflow(newSubWorkflowName.trim());
        if (!branchRes.success) {
          alert(`Lỗi tạo nhánh phụ mới: ${branchRes.error}`);
          return;
        }
        setActiveWorkflowTab(newSubWorkflowName.trim());
      }

      // Determine target block
      const targetBlock: any = targetType === 'before_init' || targetType === 'after_quit' ? targetType : 'main_logic';
      const res = insertNodesFromJson(jsonToInsert, targetBlock);

      if (res.success) {
        showToast('Áp dụng thành công', `Đã nạp ${res.count} node vào "${targetBlock}"!`);
        setAiPreviewData(null);
        setGeneratedNodes([]);
        setRawJsonOutput('');
        onClose();
      } else {
        alert(`Lỗi khi nạp JSON vào kịch bản: ${res.error || 'Dữ liệu không khớp'}`);
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể áp dụng'}`);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleRawJsonChange(text);
      }
    } catch (e) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1220] border border-[#e2e8f0] dark:border-[#1e293b] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Window Title Bar */}
        <div className="h-10 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/20 border-b border-[#e2e8f0] dark:border-[#1e293b] flex items-center justify-between px-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
            <span>AI Workflow Copilot & Skill MCP</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50">
              API :8775/create
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94a3b8] hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">

          {/* Configuration Cards: Port & Skill Server */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Card 1: Remote Debugging Port */}
            <div className="p-3 bg-slate-50 dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <span>Remote Debugging Port</span>
                  <span className="text-red-500">*</span>
                </span>
                <button
                  onClick={autoDetectPort}
                  disabled={detectingPort}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  title="Dò tìm cổng Chrome profile đang chạy"
                >
                  <RefreshCw className={`w-3 h-3 ${detectingPort ? 'animate-spin' : ''}`} />
                  <span>{detectingPort ? 'Đang dò...' : 'Tự động dò'}</span>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={port}
                  onChange={(e) => {
                    setPort(e.target.value);
                    localStorage.setItem('gpm_debug_port', e.target.value.trim());
                  }}
                  placeholder="vd: 53002"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                />
                <span className="text-[10px] px-2 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 rounded-md border border-purple-200 dark:border-purple-800/50 whitespace-nowrap">
                  port={cleanPort}
                </span>
              </div>
            </div>

            {/* Card 2: Skill Server URL */}
            <div className="p-3 bg-slate-50 dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <span>Skill & MCP Endpoint</span>
                  <span className={`inline-block w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500 shadow-xs shadow-emerald-500' : 'bg-amber-500'}`} />
                </span>
                <span className="text-[10px] text-slate-400">
                  {serverStatus === 'online' ? '🟢 Sẵn sàng' : '🟡 Đang kết nối'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="flex-1 px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs text-purple-600 dark:text-purple-300 truncate">
                  {skillServerUrl}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(skillServerUrl, 'link')}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Sao chép link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={openSkillUrl}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Mở xem tài liệu trên trình duyệt"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {hasExistingNodes && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-blue-200 dark:border-blue-900/40 text-xs">
              <span>Kịch bản hiện tại: {currentMainNodes.length} action, {subWorkflowNames.length} nhánh phụ</span>
              <button type="button" onClick={() => copyToClipboard(JSON.stringify(existingContext, null, 2), 'context')}
                className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {copiedContext ? 'Đã sao chép!' : 'Sao chép kịch bản hiện tại riêng'}
              </button>
            </div>
          )}

          {/* PREVIEW BLOCK: Styled identically to Main logic */}
          <div className="rounded-xl border border-blue-400 dark:border-blue-600/60 overflow-hidden shadow-sm">
            {/* Header styled identically to Main logic header */}
            <div className="bg-[#0070ba] dark:bg-[#0284c7] text-white px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <Box className="w-4 h-4 text-white" />
                <span>Main logic (Xem trước kịch bản tạo ra)</span>
                {generatedNodes.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-medium border border-white/20">
                    {generatedNodes.length} action(s)
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="px-2 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showRawJson ? 'Xem danh sách trực quan' : 'Xem mã JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Dán JSON từ Clipboard"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Dán JSON từ AI</span>
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="p-3 bg-white dark:bg-[#080d19] min-h-[140px] max-h-[260px] overflow-y-auto space-y-1.5">
              {showRawJson ? (
                <textarea
                  value={rawJsonOutput}
                  onChange={(e) => handleRawJsonChange(e.target.value)}
                  rows={8}
                  placeholder="Dán hoặc chỉnh sửa mã JSON của kịch bản tại đây..."
                  className="w-full p-2.5 font-mono text-xs bg-[#0b101d] text-emerald-400 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-400 leading-relaxed"
                />
              ) : generatedNodes.length > 0 ? (
                <div className="space-y-1">
                  {generatedNodes.map((node: any, idx: number) => {
                    const isBlock = 'nodes' in node;
                    const actionName = node.display_text || (isBlock ? 'Block' : 'Action');
                    const xpath = node.element_xpath;
                    const comment = node.comment;
                    return (
                      <div
                        key={node.id || idx}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-xs hover:border-blue-400 transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="shrink-0">
                            <ActionIcon actionName={actionName} actionType={node.type} className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {actionName}
                          </span>
                          {xpath && (
                            <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 truncate max-w-[280px]">
                              {xpath}
                            </span>
                          )}
                          {comment && (
                            <span className="text-[11px] text-slate-400 italic truncate max-w-[200px]">
                              // {comment}
                            </span>
                          )}
                        </div>
                        {node.delay && node.delay !== '0,0' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono shrink-0">
                            {node.delay}ms
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <Box className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="font-medium text-xs">Chưa có kịch bản tạo ra.</p>
                  <p className="text-[11px] text-slate-400 max-w-md mt-1 leading-relaxed">
                    Khi AI gọi API <code>POST http://localhost:8775/create</code>, kịch bản sẽ <strong>tự động điền trực tiếp</strong> vào phần mềm và hiển thị tại đây. Bạn cũng có thể bấm <strong>"Dán JSON từ AI"</strong> để nạp thủ công.
                  </p>
                </div>
              )}
            </div>

            {/* Target Branch selection & Apply Button */}
            <div className="p-3 bg-slate-50 dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Nơi áp dụng:</span>
                <select
                  value={isCreatingNewBranch ? 'new_branch' : targetType}
                  onChange={(e) => {
                    if (e.target.value === 'new_branch') {
                      setIsCreatingNewBranch(true);
                    } else {
                      setIsCreatingNewBranch(false);
                      setTargetType(e.target.value);
                    }
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="main_logic">Main logic (Nhánh chính)</option>
                  <option value="before_init">Before browser opened</option>
                  <option value="after_quit">After browser closed</option>
                  {subWorkflowNames.map((name) => (
                    <option key={name} value={name}>
                      Nhánh phụ: {name}
                    </option>
                  ))}
                  <option value="new_branch">+ Tạo Nhánh phụ mới (New Sub-workflow)</option>
                </select>

                {isCreatingNewBranch && (
                  <input
                    type="text"
                    value={newSubWorkflowName}
                    onChange={(e) => setNewSubWorkflowName(e.target.value)}
                    placeholder="Tên nhánh phụ mới (vd: login_step)"
                    className="px-2.5 py-1 bg-white dark:bg-[#1e293b] border border-blue-400 rounded-lg text-xs font-mono w-48 focus:outline-none"
                  />
                )}
              </div>

              <button
                type="button"
                disabled={generatedNodes.length === 0 && !rawJsonOutput.trim()}
                onClick={handleApplyToWorkflow}
                className="px-6 py-2 rounded-xl bg-[#0070ba] hover:bg-[#005a96] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Áp dụng vào Kịch bản ngay</span>
              </button>
            </div>
          </div>

          {/* Ready-to-copy Prompts Section (Hai bước: Bước 1 đọc skill, Bước 2 câu lệnh thao tác) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Sao chép Prompt gửi cho AI (Antigravity / Cursor / Claude / ChatGPT):</span>
              </span>
            </div>

            {/* Bước 1 Box */}
            <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  <span>Bước 1: Gửi cho AI đọc hiểu Skill & JSON Schema tại :8775 trước</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(promptStep1, 'step1')}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  {copiedStep1 ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép Prompt đọc Skill (Bước 1)</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-[#0b101d] border border-purple-100 dark:border-purple-900/30 font-mono text-xs text-slate-700 dark:text-slate-300 select-all leading-relaxed whitespace-pre-wrap">
                {promptStep1}
              </div>
            </div>

            {/* Bước 2 Box */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  <span>Bước 2: Sao chép rồi viết kịch bản · port={cleanPort}</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(promptStep2, 'step2')}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                >
                  {copiedStep2 ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Đã sao chép thành công!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép Prompt Thao Tác (Bước 2)</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-[#0b101d] border border-indigo-100 dark:border-indigo-900/40 font-mono text-xs text-indigo-950 dark:text-indigo-200 select-all leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {promptStep2}
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="h-10 bg-slate-50 dark:bg-[#0f172a] border-t border-[#e2e8f0] dark:border-[#1e293b] flex items-center justify-between px-5 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Server: <code>{skillServerUrl}</code></span>
            <span>•</span>
            <span>Project: <strong>{currentProject?.info.name || 'Untitled'}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            Đóng (Esc)
          </button>
        </div>

      </div>
    </div>
  );
};
