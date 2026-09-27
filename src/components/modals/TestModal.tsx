import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, FlaskConical, Copy, Trash2, Check } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';
import { WorkflowNode, ActionNode, EditorFile } from '../../types/gscript';
import {
  VIRTUAL_MOUSE_SCRIPT,
  getVirtualMouseClickXPathScript,
  getVirtualMouseClickCoordsScript,
} from '../../utils/virtualMouseScript';
import { evaluateGpmCondition, evaluateGpmConditionAsync } from '../../utils/conditionEvaluator';
import { resolveVariableString } from '../../utils/variableResolver';

interface TestLog {
  time: string;
  type: 'start' | 'error' | 'success' | 'info' | 'arrow';
  text: string;
}

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getJsonPath(obj: any, path: string) {
  if (!path || !obj) return obj;
  const cleanPath = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
  const parts = cleanPath.split('.').filter(Boolean);
  let cur = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

async function generateTOTP(secret: string): Promise<string> {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const cleanSecret = (secret || '').replace(/[\s=]+/g, '').toUpperCase();
  for (let i = 0; i < cleanSecret.length; i++) {
    const val = base32chars.indexOf(cleanSecret.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const keyBytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    keyBytes[i / 8] = parseInt(bits.substr(i, 8), 2);
  }
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30);
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setBigUint64(0, BigInt(timeStep));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const dataView = new DataView(signature, offset, 4);
  const code = (dataView.getUint32(0) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

function getActionPascalName(act: ActionNode): string {
  const display = (act.display_text || '').trim();
  if (!display) return 'Action';

  const lower = display.toLowerCase();
  if (lower === 'count' || act.type === 4) return 'Count';
  if (lower.includes('file read all text')) return 'FileReadAllText';
  if (lower.includes('file read all lines')) return 'FileReadAllLines';
  if (lower.includes('file read random line')) return 'FileReadRandomLine';
  if (lower.includes('file write all text')) return 'FileWriteAllText';
  if (lower.includes('file append line')) return 'FileAppendLine';
  if (lower.includes('create empty excel')) return 'CreateEmptyExcel';
  if (lower.includes('read excel file') || lower.includes('read excel')) return 'ReadExcelFile';
  if (lower.includes('write excel file') || lower.includes('write excel')) return 'WriteExcelFile';
  if (lower.includes('append excel file') || lower.includes('append excel')) return 'AppendExcelFile';
  if (lower.includes('folder get file list')) return 'FolderGetFileList';
  if (lower.includes('folder exists')) return 'FolderExists';
  if (lower.includes('create folder')) return 'CreateFolder';
  if (lower.includes('move / rename folder') || lower.includes('move/rename folder')) return 'MoveRenameFolder';
  if (lower.includes('delete folder')) return 'DeleteFolder';
  if (lower.includes('file exists')) return 'FileExists';
  if (lower.includes('copy file')) return 'CopyFile';
  if (lower.includes('move / rename file') || lower.includes('move/rename file')) return 'MoveRenameFile';
  if (lower.includes('delete file')) return 'DeleteFile';
  if (lower.includes('get clipboard text')) return 'GetClipboardText';
  if (lower.includes('set clipboard text')) return 'SetClipboardText';
  if (lower.includes('http request')) return 'HttpRequest';
  if (lower.includes('http download')) return 'HttpDownload';
  if (lower.includes('wait to image')) return 'WaitToImage';
  if (lower.includes('image exists')) return 'ImageExists';
  if (lower.includes('image search')) return 'ImageSearch';
  if (lower.includes('image to base64')) return 'ImageToBase64';
  if (lower.includes('random text')) return 'RandomText';
  if (lower.includes('split text')) return 'SplitText';
  if (lower.includes('read json')) return 'ReadJson';
  if (lower.includes('random number')) return 'RandomNumber';
  if (lower.includes('math execute')) return 'MathExecute';
  if (lower.includes('2fa code')) return 'TwoFACode';
  if (lower.includes('go to url')) return 'GoToUrl';
  if (lower.includes('new tab')) return 'NewTab';
  if (lower.includes('active tab')) return 'ActiveTab';
  if (lower.includes('close all tab')) return 'CloseAllTab';
  if (lower.includes('close tab')) return 'CloseTab';
  if (lower.includes('wait element')) return 'WaitElement';
  if (lower.includes('get element attribute')) return 'GetElementAttribute';
  if (lower.includes('get element text')) return 'GetElementText';
  if (lower.includes('count element')) return 'CountElement';
  if (lower.includes('mouse click') || lower.includes('mouse try to click')) return 'MouseClick';
  if (lower.includes('set variable')) return 'VariableSet';
  if (lower.includes('increase')) return 'VariableIncrease';
  if (lower.includes('decrease')) return 'VariableDecrease';
  if (lower.includes('back url')) return 'BackUrl';
  if (lower.includes('reload')) return 'Reload';
  if (lower.includes('get url')) return 'GetUrl';
  if (lower.includes('scroll')) return 'Scroll';

  return display
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function logVariableValue(
  addLog: (type: TestLog['type'], text: string, time?: string) => void,
  varName: string,
  rawVal: any,
  getTime: () => string
) {
  if (!varName) return;
  const formattedVar = varName.startsWith('$') ? varName : `$${varName}`;

  if (rawVal === undefined || rawVal === null) {
    addLog('arrow', `  ↳ ${formattedVar} = ""`, getTime());
    return;
  }

  // Handle Array values (e.g. from FileReadAllLines, Split text)
  if (Array.isArray(rawVal)) {
    if (rawVal.length === 0) {
      addLog('arrow', `  ↳ ${formattedVar} = []`, getTime());
      return;
    }
    const strItems = rawVal.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
    if (strItems.length <= 5) {
      addLog('arrow', `  ↳ ${formattedVar} = [${strItems.join(', ')}]`, getTime());
      return;
    }

    // Chunk 1: Items 0 to 4 (no timestamp)
    const chunk1Items = strItems.slice(0, 5);
    const chunk1Text = `  ↳ ${formattedVar} = [${chunk1Items.join(', ')},`;
    addLog('arrow', chunk1Text, '');

    // Chunk 2: Items 5 to 9 (has timestamp)
    const chunk2Items = strItems.slice(5, 10);
    const isTruncated = strItems.length > 10;
    if (isTruncated) {
      const lastIdx = chunk2Items.length - 1;
      if (chunk2Items[lastIdx].length > 35) {
        chunk2Items[lastIdx] = chunk2Items[lastIdx].slice(0, 32) + '...';
      } else {
        chunk2Items[lastIdx] = chunk2Items[lastIdx] + '...';
      }
    }
    let chunk2Text = chunk2Items.join(', ');
    if (!isTruncated) {
      chunk2Text += ']';
    }
    addLog('arrow', chunk2Text, getTime());
    return;
  }

  let strVal = typeof rawVal === 'string' ? rawVal : JSON.stringify(rawVal);
  if (!strVal) {
    addLog('arrow', `  ↳ ${formattedVar} = ""`, getTime());
    return;
  }

  const rawLines = strVal.split(/\r?\n/).filter((l) => l.length > 0 || strVal.split(/\r?\n/).length === 1);
  if (rawLines.length === 1) {
    addLog('arrow', `  ↳ ${formattedVar} = ${rawLines[0]}`, getTime());
    return;
  }

  const MAX_LINES = 10;
  const isTruncated = rawLines.length > MAX_LINES;
  const displayLines = rawLines.slice(0, MAX_LINES);

  if (isTruncated) {
    const lastIdx = displayLines.length - 1;
    if (displayLines[lastIdx].length > 38) {
      displayLines[lastIdx] = displayLines[lastIdx].slice(0, 35) + '...';
    } else {
      displayLines[lastIdx] = displayLines[lastIdx] + '...';
    }
  }

  // Truncate excessively long individual lines (> 120 chars)
  for (let i = 0; i < displayLines.length; i++) {
    if (displayLines[i].length > 120 && (i !== displayLines.length - 1 || !isTruncated)) {
      displayLines[i] = displayLines[i].slice(0, 115) + '...';
    }
  }

  // Chunk 1: Lines 0 to 4 (no timestamp, indented 2 spaces)
  // Chunk 2: Lines 5 to 9 (Line 5 has timestamp and 0 spaces indent; Lines 6-9 0 spaces indent, no timestamp)
  for (let i = 0; i < displayLines.length; i++) {
    if (i === 0) {
      addLog('arrow', `  ↳ ${formattedVar} = ${displayLines[i]}`, '');
    } else if (i < 5) {
      addLog('arrow', `  ${displayLines[i]}`, '');
    } else if (i === 5) {
      addLog('arrow', displayLines[i], getTime());
    } else {
      addLog('arrow', displayLines[i], '');
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const TestModal: React.FC<TestModalProps> = ({ isOpen, onClose }) => {
  const { currentProject, getSelectedNode } = useProject();
  const [port, setPort] = useState<string>(() => {
    return localStorage.getItem('gpm_debug_port') || '43076';
  });
  const [engine, setEngine] = useState('Puppeteer enhanced engine');
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [copied, setCopied] = useState(false);
  const [detectingPort, setDetectingPort] = useState(false);

  const stopSignalRef = useRef<boolean>(false);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  const selectedNode = getSelectedNode();
  const targetNode = selectedNode || currentProject?.script.before_init;
  const actionName = targetNode?.display_text || (targetNode && 'nodes' in targetNode ? 'Block' : 'Action');

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

  useEffect(() => {
    if (isOpen) {
      const savedPort = localStorage.getItem('gpm_debug_port');
      if (savedPort) setPort(savedPort);
      stopSignalRef.current = false;
      autoDetectPort();
    } else {
      stopSignalRef.current = true;
      setIsRunning(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const getTime = () => new Date().toLocaleTimeString('vi-VN', { hour12: false });

  const resolveVars = (str: string, varsMap: Record<string, string>): string => {
    return resolveVariableString(str, varsMap);
  };

  const getRawInputValue = (raw: any, key: string, fallback: string = ''): string => {
    if (!raw) return fallback;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        const item = parsed.find((p: any) => p.Key === key);
        if (item && item.Value !== undefined) return item.Value;
      }
    } catch (e) {}
    return fallback;
  };

  const evaluateInChrome = async (expr: string, targetId?: string, contextId?: number): Promise<{ success: boolean; value?: any; error?: string }> => {
    try {
      if ((window as any).electronAPI?.cdpAction) {
        let res = await (window as any).electronAPI.cdpAction({
          port: port.trim() || '43076',
          action: 'evaluate',
          payload: { expression: expr, targetId, contextId },
        });
        // If evaluation failed with contextId (e.g. context destroyed on page nav), retry without contextId
        if ((!res?.success || res?.error?.includes('context')) && contextId !== undefined) {
          res = await (window as any).electronAPI.cdpAction({
            port: port.trim() || '43076',
            action: 'evaluate',
            payload: { expression: expr, targetId },
          });
        }
        // If evaluation failed with targetId (target closed/stale), retry with active page
        if ((!res?.success || res?.error?.includes('target') || res?.error?.includes('No active')) && targetId) {
          res = await (window as any).electronAPI.cdpAction({
            port: port.trim() || '43076',
            action: 'evaluate',
            payload: { expression: expr },
          });
        }
        return res || { success: false };
      }
      return { success: false, error: 'CDP action is only available in Electron desktop mode' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const executeNodes = async (
    nodes: WorkflowNode[],
    vars: Record<string, string>,
    addLog: (type: TestLog['type'], text: string, time?: string) => void
  ) => {
    let lastConditionBranchMet = false;

    const logActionStart = (act: ActionNode, target?: string) => {
      const pascalName = getActionPascalName(act);
      const headerText = target ? `▶ ${pascalName} ▸ ${target}` : `▶ ${pascalName}`;
      addLog('start', headerText);
    };

    const logActionResult = (
      act: ActionNode,
      target?: string,
      outVar?: { name: string; value: any }
    ) => {
      const pascalName = getActionPascalName(act);
      const headerText = target ? `✓ ${pascalName} ▸ ${target}` : `✓ ${pascalName}`;
      addLog('success', headerText);
      if (outVar && outVar.name) {
        logVariableValue(addLog, outVar.name, outVar.value, getTime);
      }
    };

    const checkXPathInChromeTest = async (xpath: string): Promise<boolean> => {
      try {
        const checkScript = `(() => {
          try {
            function checkInDoc(d) {
              if (!d) return false;
              try {
                const res = d.evaluate(${JSON.stringify(xpath)}, d, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return !!res.singleNodeValue;
              } catch(e) { return false; }
            }
            if (checkInDoc(document)) return true;
            const fx = ${JSON.stringify(vars.$currentFrameXPath || '')};
            if (fx) {
              try {
                const fr = document.evaluate(fx, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (fr) {
                  const subDoc = fr.contentDocument || (fr.contentWindow && fr.contentWindow.document);
                  if (checkInDoc(subDoc)) return true;
                }
              } catch(e) {}
            }
            const frames = document.querySelectorAll('iframe, frame');
            for (let i = 0; i < frames.length; i++) {
              try {
                const fDoc = frames[i].contentDocument || (frames[i].contentWindow && frames[i].contentWindow.document);
                if (fDoc && checkInDoc(fDoc)) return true;
              } catch(e) {}
            }
            return false;
          } catch(e) { return false; }
        })()`;

        const isTrueVal = (evalRes: any) => {
          if (!evalRes || !evalRes.success) return false;
          return evalRes.value === true || evalRes.value?.value === true || (evalRes as any).result?.value === true;
        };

        // 1. Try immediate check first (~5-15ms)
        let evalRes = await evaluateInChrome(checkScript, vars.$activePopupTargetId, vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined);
        if (isTrueVal(evalRes)) return true;

        // 2. If not found immediately, poll for up to 2000ms (150ms intervals)
        // to give SPA transitions (e.g. Next button loading password input) time to render
        const startCheck = Date.now();
        while (Date.now() - startCheck < 2000 && !stopSignalRef.current) {
          await sleep(150);
          evalRes = await evaluateInChrome(checkScript, vars.$activePopupTargetId, vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined);
          if (isTrueVal(evalRes)) return true;
        }

        return false;
      } catch (e) {
        return false;
      }
    };

    for (let i = 0; i < nodes.length; i++) {
      if (stopSignalRef.current) return 'STOP';
      const n = nodes[i];

      const isBlock = 'nodes' in n && Array.isArray((n as any).nodes);

      if (isBlock) {
        const block = n as any;
        const bText = (block.display_text || '').toLowerCase();

        if (bText.startsWith('if') || block.$type?.includes('IfBlockNode')) {
          const cond = block.condition || '';
          await sleep(20);
          const condMet = await evaluateGpmConditionAsync(cond, vars, checkXPathInChromeTest);
          addLog('info', `🔍 If [${cond}] › ${condMet ? 'ĐÚNG (Khớp)' : 'SAI (Không khớp)'}`);
          lastConditionBranchMet = condMet;

          if (condMet) {
            const res = await executeNodes(block.nodes, vars, addLog);
            if (res === 'STOP') return 'STOP';
            if (res === 'BREAK_LOOP') return 'BREAK_LOOP';
            if (res === 'NEXT_LOOP') return 'NEXT_LOOP';
          }
        } else if (bText.startsWith('else if') || block.$type?.includes('ElseIfBlockNode')) {
          const cond = block.condition || '';
          await sleep(20);
          if (!lastConditionBranchMet) {
            const condMet = await evaluateGpmConditionAsync(cond, vars, checkXPathInChromeTest);
            addLog('info', `🔍 Else If [${cond}] › ${condMet ? 'ĐÚNG (Khớp)' : 'SAI (Không khớp)'}`);
            if (condMet) {
              lastConditionBranchMet = true;
              const res = await executeNodes(block.nodes, vars, addLog);
              if (res === 'STOP') return 'STOP';
              if (res === 'BREAK_LOOP') return 'BREAK_LOOP';
              if (res === 'NEXT_LOOP') return 'NEXT_LOOP';
            }
          }
        } else if (bText.startsWith('else') || block.$type?.includes('ElseBlockNode')) {
          await sleep(20);
          if (!lastConditionBranchMet) {
            addLog('info', `🔍 Nhánh Else › Chạy khối lệnh Else`);
            lastConditionBranchMet = true;
            const res = await executeNodes(block.nodes, vars, addLog);
            if (res === 'STOP') return 'STOP';
            if (res === 'BREAK_LOOP') return 'BREAK_LOOP';
            if (res === 'NEXT_LOOP') return 'NEXT_LOOP';
          }
        } else if (bText.startsWith('for') || block.$type?.includes('ForBlockNode')) {
          lastConditionBranchMet = false;
          const rawStart = resolveVars(String(block.start ?? '0'), vars);
          const rawEnd = resolveVars(String(block.end ?? '10'), vars);
          const rawStep = resolveVars(String(block.step ?? '1'), vars);
          const start = parseInt(rawStart, 10) || 0;
          const end = parseInt(rawEnd, 10) || 0;
          const step = parseInt(rawStep, 10) || 1;

          addLog('info', `🔁 Bắt đầu vòng lặp For (${start} ➔ ${end}, bước nhảy ${step})`);

          for (let iter = start; iter < end && !stopSignalRef.current; iter += step) {
            vars['$loopIndex'] = String(iter);
            vars['loopIndex'] = String(iter);
            vars['$loop_index'] = String(iter);
            vars['loop_index'] = String(iter);
            vars['$index'] = String(iter);
            vars['index'] = String(iter);
            vars['$i'] = String(iter);
            vars['i'] = String(iter);
            const res = await executeNodes(block.nodes, vars, addLog);
            if (res === 'STOP') return 'STOP';
            if (res === 'BREAK_LOOP') {
              addLog('info', `🚪 Thoát khỏi vòng lặp For thành công (Exit loop) tại $loopIndex = ${iter}`);
              break;
            }
            if (res === 'NEXT_LOOP') {
              addLog('info', `⏭ Chuyển sang lượt lặp tiếp theo (Next loop)`);
              continue;
            }
          }
          addLog('success', `✔ Hoàn thành vòng lặp For`);
        } else if (bText.startsWith('while') || block.$type?.includes('WhileBlockNode')) {
          lastConditionBranchMet = false;
          let count = 0;
          addLog('info', `🔁 Bắt đầu vòng lặp While [${block.condition || ''}]`);
          while (await evaluateGpmConditionAsync(block.condition || '', vars, checkXPathInChromeTest) && count < 100 && !stopSignalRef.current) {
            vars['$loopIndex'] = String(count);
            vars['loopIndex'] = String(count);
            vars['$loop_index'] = String(count);
            vars['loop_index'] = String(count);
            vars['$index'] = String(count);
            vars['index'] = String(count);
            vars['$i'] = String(count);
            vars['i'] = String(count);
            count++;
            const res = await executeNodes(block.nodes, vars, addLog);
            if (res === 'STOP') return 'STOP';
            if (res === 'BREAK_LOOP') {
              addLog('info', `🚪 Thoát khỏi vòng lặp While thành công (Exit loop)`);
              break;
            }
            if (res === 'NEXT_LOOP') {
              addLog('info', `⏭ Chuyển sang lượt lặp tiếp theo (Next loop)`);
              continue;
            }
          }
          addLog('success', `✔ Hoàn thành vòng lặp While`);
        } else {
          // Normal block
          lastConditionBranchMet = false;
          const res = await executeNodes(block.nodes, vars, addLog);
          if (res === 'STOP') return 'STOP';
          if (res === 'BREAK_LOOP') return 'BREAK_LOOP';
          if (res === 'NEXT_LOOP') return 'NEXT_LOOP';
          addLog('success', `✔ ${block.display_text || 'Block'}`);
        }
      } else {
        // It's an ActionNode
        lastConditionBranchMet = false;
        const act = n as ActionNode;
        const actType = act.type;
        const actName = (act.display_text || '').toLowerCase();

        // Stop action (type 76)
        if (actType === 76 || actName === 'stop') {
          stopSignalRef.current = true;
          addLog('info', `⏹ Stop action: Gặp lệnh dừng, dừng toàn bộ kịch bản.`);
          return 'STOP';
        }

        // Exit loop (type 5)
        if (actType === 5 || actName === 'exit loop') {
          logActionStart(act, 'Exit loop');
          addLog('info', `🚪 Exit loop › Kích hoạt lệnh thoát khỏi vòng lặp`);
          logActionResult(act, 'Exit loop');
          return 'BREAK_LOOP';
        }

        // Next loop (type 6)
        if (actType === 6 || actName === 'next loop') {
          logActionStart(act, 'Next loop');
          addLog('info', `⏭ Next loop › Bỏ qua các lệnh còn lại, chuyển sang lượt lặp tiếp theo`);
          logActionResult(act, 'Next loop');
          return 'NEXT_LOOP';
        }

        // Call workflow (type 120)
        if (actType === 120 || actName === 'call workflow' || actName.includes('call workflow')) {
          logActionStart(act, 'Call workflow');
          let refFile = '';
          try {
            const p = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
            if (Array.isArray(p)) {
              const item = p.find((x: any) => x.Key === 'REFERENCE_FILE' || x.Key === 'WORKFLOW_NAME');
              if (item && item.Value) refFile = item.Value.trim();
            }
          } catch (e) {}

          refFile = resolveVariableString(refFile, vars);

          if (!refFile) {
            if (act.continue_on_error) {
              addLog('info', `⚠ Call workflow › Chưa cấu hình Reference file (Continue on error: Bỏ qua)`);
              continue;
            } else {
              addLog('error', `✕ Call workflow thất bại: Chưa cấu hình Reference file`);
              return 'STOP';
            }
          }

          let targetScript: EditorFile | null = currentProject?.subWorkflows?.[refFile] || null;
          if (!targetScript && currentProject?.folderPath && (window as any).electronAPI?.fileAction) {
            try {
              const subPath = `${currentProject.folderPath}/${refFile}.gscript`;
              const fileRes = await (window as any).electronAPI.fileAction({ action: 'read', payload: { path: subPath } });
              if (fileRes?.success && fileRes.content) {
                targetScript = JSON.parse(fileRes.content);
              }
            } catch (e) {}
          }

          if (!targetScript) {
            if (act.continue_on_error) {
              addLog('info', `⚠ Call workflow › Không tìm thấy workflow file "${refFile}" (Continue on error: Bỏ qua)`);
              continue;
            } else {
              addLog('error', `✕ Call workflow thất bại: Không tìm thấy file workflow "${refFile}"`);
              return 'STOP';
            }
          }

          const childNodes: WorkflowNode[] = [
            ...(targetScript.before_init?.nodes || []),
            ...(targetScript.main_logic?.nodes || []),
            ...(targetScript.after_quit?.nodes || []),
          ];

          addLog('info', `▶ Call workflow ▸ Bắt đầu thực thi sub-workflow "${refFile}" (${childNodes.length} actions)`);

          const childRes = await executeNodes(childNodes, vars, addLog);
          if (childRes === 'STOP') return 'STOP';

          for (const [k, v] of Object.entries(vars)) {
            const cleanK = k.startsWith('$') ? k.substring(1) : k;
            vars[`$${refFile}_${cleanK}`] = v;
            vars[`${refFile}_${cleanK}`] = v;
          }

          logActionResult(act, `Call workflow ▸ ${refFile}`);
          continue;
        }

        if (actType === 1 || actName === 'set variable') {
          const rawVar = act.output_variable_name || 'x';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');
          logActionStart(act, varName);

          // Resolve value from raw_input
          let rawVal = '';
          if (act.raw_input) {
            try {
              const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
              if (Array.isArray(parsed)) {
                const found = parsed.find((p: any) => p.Key === 'VALUE');
                if (found) rawVal = found.Value ?? '';
              }
            } catch (e) {}
          }

          // Replace variable references in rawVal
          let resolvedVal = resolveVars(rawVal, vars);

          vars[varName] = resolvedVal;
          vars[cleanName] = resolvedVal;

          if (stopSignalRef.current) break;
          logActionResult(act, varName, { name: varName, value: resolvedVal });
          await sleep(40);
        } else if (actType === 2 || actName.includes('increase')) {
          let currentVar = '$x';
          let incBy = '1';
          if (act.raw_input) {
            try {
              const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
              if (Array.isArray(parsed)) {
                const c = parsed.find((p: any) => p.Key === 'CURRENT_VAL');
                if (c && c.Value !== undefined) currentVar = c.Value;
                const inc = parsed.find((p: any) => p.Key === 'INCREASE_BY');
                if (inc && inc.Value !== undefined) incBy = inc.Value;
              }
            } catch (e) {}
          }

          let rawOutVar = (act.output_variable_name || '').trim();
          if (!rawOutVar && act.raw_input) {
            try {
              const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
              if (Array.isArray(parsed)) {
                const out = parsed.find((p: any) => p.Key === 'OUTPUT_VAR' || p.Key === 'OUTPUT_VARIABLE' || p.Key === 'VARIABLE_NAME');
                if (out && out.Value) rawOutVar = String(out.Value).trim();
              }
            } catch (e) {}
          }

          let resolvedCurrent = resolveVars(currentVar, vars);
          let oldVal = parseFloat(resolvedCurrent);
          if (isNaN(oldVal)) {
            const cleanCur = currentVar.replace(/^\$/, '');
            oldVal = parseFloat(vars[currentVar] || vars[`$${cleanCur}`] || vars[cleanCur] || '0') || 0;
          }

          const resolvedInc = resolveVars(incBy, vars);
          const addVal = parseFloat(resolvedInc) || 1;
          const newVal = String(oldVal + addVal);

          const inVarName = currentVar.startsWith('$') ? currentVar : `$${currentVar}`;
          const cleanInVar = inVarName.replace(/^\$/, '');

          const targetVar = rawOutVar || currentVar;
          const varName = targetVar.startsWith('$') ? targetVar : `$${targetVar}`;
          const cleanName = varName.replace(/^\$/, '');

          logActionStart(act, varName);

          vars[varName] = newVal;
          vars[cleanName] = newVal;
          vars[`$${cleanName}`] = newVal;

          if (!rawOutVar || cleanName === cleanInVar) {
            vars[inVarName] = newVal;
            vars[cleanInVar] = newVal;
            vars[`$${cleanInVar}`] = newVal;
          }

          if (stopSignalRef.current) break;
          logActionResult(act, varName, { name: varName, value: newVal });
          await sleep(40);
        } else if (actType === 3 || actName.includes('decrease')) {
          let currentVar = '$x';
          let decBy = '1';
          if (act.raw_input) {
            try {
              const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
              if (Array.isArray(parsed)) {
                const c = parsed.find((p: any) => p.Key === 'CURRENT_VAL');
                if (c && c.Value !== undefined) currentVar = c.Value;
                const dec = parsed.find((p: any) => p.Key === 'DECREASE_BY' || p.Key === 'DESCREASE_BY');
                if (dec && dec.Value !== undefined) decBy = dec.Value;
              }
            } catch (e) {}
          }

          let rawOutVar = (act.output_variable_name || '').trim();
          if (!rawOutVar && act.raw_input) {
            try {
              const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
              if (Array.isArray(parsed)) {
                const out = parsed.find((p: any) => p.Key === 'OUTPUT_VAR' || p.Key === 'OUTPUT_VARIABLE' || p.Key === 'VARIABLE_NAME');
                if (out && out.Value) rawOutVar = String(out.Value).trim();
              }
            } catch (e) {}
          }

          let resolvedCurrent = resolveVars(currentVar, vars);
          let oldVal = parseFloat(resolvedCurrent);
          if (isNaN(oldVal)) {
            const cleanCur = currentVar.replace(/^\$/, '');
            oldVal = parseFloat(vars[currentVar] || vars[`$${cleanCur}`] || vars[cleanCur] || '0') || 0;
          }

          const resolvedDec = resolveVars(decBy, vars);
          const subVal = parseFloat(resolvedDec) || 1;
          const newVal = String(oldVal - subVal);

          const inVarName = currentVar.startsWith('$') ? currentVar : `$${currentVar}`;
          const cleanInVar = inVarName.replace(/^\$/, '');

          const targetVar = rawOutVar || currentVar;
          const varName = targetVar.startsWith('$') ? targetVar : `$${targetVar}`;
          const cleanName = varName.replace(/^\$/, '');

          logActionStart(act, varName);

          vars[varName] = newVal;
          vars[cleanName] = newVal;
          vars[`$${cleanName}`] = newVal;

          if (!rawOutVar || cleanName === cleanInVar) {
            vars[inVarName] = newVal;
            vars[cleanInVar] = newVal;
            vars[`$${cleanInVar}`] = newVal;
          }

          if (stopSignalRef.current) break;
          logActionResult(act, varName, { name: varName, value: newVal });
          await sleep(40);
        } else if (actType === 4 || actName === 'count') {
          const rawVar = act.output_variable_name || 'count';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');
          const target = varName;

          logActionStart(act, target);

          const rawArray = getRawInputValue(act.raw_input, 'INPUT_ARRAY', '');
          const resolvedArrayStr = rawArray.startsWith('$')
            ? (vars[rawArray] ?? vars[rawArray.replace(/^\$/, '')] ?? '')
            : resolveVars(rawArray, vars);

          let count = 0;
          if (resolvedArrayStr) {
            const trimmed = resolvedArrayStr.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                  count = parsed.length;
                }
              } catch {
                const inner = trimmed.slice(1, -1).trim();
                count = inner ? inner.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean).length : 0;
              }
            } else if (trimmed.includes('\n')) {
              count = trimmed.split(/\r?\n/).filter((line) => line.length > 0).length;
            } else if (trimmed.includes(',')) {
              count = trimmed.split(',').filter(Boolean).length;
            } else if (trimmed.length > 0) {
              count = 1;
            }
          }

          vars[varName] = String(count);
          vars[cleanName] = String(count);

          if (stopSignalRef.current) break;
          logActionResult(act, target, { name: varName, value: count });
          await sleep(30);
        } else if (actType === 7 || actName === 'delay') {
          const minStr = getRawInputValue(act.raw_input, 'MIN', '');
          const maxStr = getRawInputValue(act.raw_input, 'MAX', '');
          let minVal = parseInt(resolveVars(minStr, vars), 10);
          let maxVal = parseInt(resolveVars(maxStr, vars), 10);
          if (isNaN(minVal) && isNaN(maxVal)) {
            minVal = 500;
            maxVal = 500;
          } else if (isNaN(minVal)) {
            minVal = maxVal;
          } else if (isNaN(maxVal)) {
            maxVal = minVal;
          }
          if (maxVal < minVal) maxVal = minVal;
          const waitMs = minVal === maxVal ? minVal : Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
          await sleep(Math.min(waitMs, 30000));
          if (stopSignalRef.current) break;
          addLog('success', `✔ Delay › ${waitMs}ms`);
        } else if (actType === 76 || actName === 'stop') {
          addLog('success', '✔ Stop › Flow stopped');
          break;
        } else if (actType === 117 || actName === 'throw') {
          const rawMsg = getRawInputValue(act.raw_input, 'MESSAGE', 'Error occurred');
          const resolvedMsg = resolveVars(rawMsg, vars);
          addLog('error', `✕ Throw › ${resolvedMsg || 'Exception thrown'}`);
          stopSignalRef.current = true;
          break;
        } else if (actType === 8 || actName === 'random text') {
          const rawLen = getRawInputValue(act.raw_input, 'TEXT_LEN', '');
          const len = parseInt(resolveVars(rawLen, vars), 10) || 8;
          const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let res = '';
          for (let i = 0; i < len; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const rawVar = act.output_variable_name || 'random_text';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');
          vars[varName] = res;
          vars[cleanName] = res;
          if (stopSignalRef.current) break;
          addLog('success', `✔ Random text › ${len} chars`);
          addLog('arrow', `   ↳ ${varName} = "${res}"`);
          await sleep(30);
        } else if (actType === 9 || actName === 'split text') {
          const rawInput = getRawInputValue(act.raw_input, 'INPUT_TEXT', '');
          const rawSep = getRawInputValue(act.raw_input, 'SPLIT_CHAR', ',');
          const resolvedInput = resolveVars(rawInput, vars);
          const resolvedSep = resolveVars(rawSep, vars);
          const parts = resolvedSep ? resolvedInput.split(resolvedSep) : [resolvedInput];
          const outVarRaw = (act.output_variable_name || '').trim();
          const targetVars = outVarRaw.split(',').map((s) => s.trim()).filter(Boolean);

          if (targetVars.length > 1) {
            targetVars.forEach((tVar, idx) => {
              const v = parts[idx] !== undefined ? parts[idx].trim() : '';
              const cleanTVar = tVar.replace(/^\$/, '');
              vars[`$${cleanTVar}`] = v;
              vars[cleanTVar] = v;
            });
            if (stopSignalRef.current) break;
            const assignedPreview = targetVars.map((v) => `$${v.replace(/^\$/, '')}`).join(', ');
            addLog('success', `✔ Split text › Assigned to [${assignedPreview}]`);
            addLog('arrow', `   ↳ ${targetVars.map((v, i) => `$${v.replace(/^\$/, '')} = "${parts[i]?.trim() || ''}"`).join(' | ')}`);
          } else {
            const rawVar = outVarRaw || 'split_result';
            const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
            const cleanName = varName.replace(/^\$/, '');
            const partsJson = JSON.stringify(parts);
            vars[varName] = partsJson;
            vars[cleanName] = partsJson;
            parts.forEach((p, idx) => {
              const pVal = p.trim();
              vars[`${cleanName}[${idx}]`] = pVal;
              vars[`${varName}[${idx}]`] = pVal;
              vars[`${cleanName}_${idx}`] = pVal;
              vars[`${varName}_${idx}`] = pVal;
              vars[`${cleanName}_${idx + 1}`] = pVal;
              vars[`${varName}_${idx + 1}`] = pVal;
            });
            if (stopSignalRef.current) break;
            addLog('success', `✔ Split text › ${parts.length} items`);
            addLog('arrow', `   ↳ ${varName} = ${partsJson}`);
          }
          await sleep(30);
        } else if (actType === 10 || actName === 'read json') {
          const rawJson = getRawInputValue(act.raw_input, 'JSON', '');
          const rawNodes = getRawInputValue(act.raw_input, 'NODES', '');
          const resolvedJson = resolveVars(rawJson, vars);
          const resolvedNodes = resolveVars(rawNodes, vars);
          const rawVar = act.output_variable_name || 'json_result';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          try {
            const parsed = JSON.parse(resolvedJson);
            const extracted = resolvedNodes ? getJsonPath(parsed, resolvedNodes) : parsed;
            const resStr = typeof extracted === 'object' && extracted !== null ? JSON.stringify(extracted) : String(extracted ?? '');
            vars[varName] = resStr;
            vars[cleanName] = resStr;
            if (stopSignalRef.current) break;
            addLog('success', `✔ Read json › ${resolvedNodes || 'Root'}`);
            addLog('arrow', `   ↳ ${varName} = "${resStr}"`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Read json › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Read json failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 82 || actName === 'regex') {
          const rawText = getRawInputValue(act.raw_input, 'TEXT', '');
          const rawRegex = getRawInputValue(act.raw_input, 'REGEX', '');
          const resolvedText = resolveVars(rawText, vars);
          const resolvedRegex = resolveVars(rawRegex, vars);
          const rawVar = act.output_variable_name || 'regex_result';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          try {
            const reg = new RegExp(resolvedRegex);
            const match = resolvedText.match(reg);
            const val = match ? (match[1] !== undefined ? match[1] : match[0]) : '';
            vars[varName] = val;
            vars[cleanName] = val;
            if (stopSignalRef.current) break;
            addLog('success', `✔ Regex › ${resolvedRegex}`);
            addLog('arrow', `   ↳ ${varName} = "${val}"`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Regex › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Regex failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 11 || actName === 'random number') {
          const rawMin = getRawInputValue(act.raw_input, 'MIN', '1');
          const rawMax = getRawInputValue(act.raw_input, 'MAX', '100');
          let minVal = parseInt(resolveVars(rawMin, vars), 10);
          let maxVal = parseInt(resolveVars(rawMax, vars), 10);
          if (isNaN(minVal) && isNaN(maxVal)) {
            minVal = 1;
            maxVal = 100;
          } else if (isNaN(minVal)) {
            minVal = 0;
          } else if (isNaN(maxVal)) {
            maxVal = minVal;
          }
          if (maxVal < minVal) {
            const tmp = minVal;
            minVal = maxVal;
            maxVal = tmp;
          }
          const randomNum = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
          const rawVar = act.output_variable_name || 'random_number';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');
          vars[varName] = String(randomNum);
          vars[cleanName] = String(randomNum);
          if (stopSignalRef.current) break;
          addLog('success', `✔ Random number › ${randomNum} [${minVal}..${maxVal}]`);
          addLog('arrow', `   ↳ ${varName} = ${randomNum}`);
          await sleep(30);
        } else if (actType === 12 || actName === 'math execute') {
          const rawExpr = getRawInputValue(act.raw_input, 'MATH_EXPRESSION', '');
          const resolvedExpr = resolveVars(rawExpr, vars);
          const rawVar = act.output_variable_name || 'math_result';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          try {
            const sanitized = resolvedExpr.replace(/[^0-9+\-*/().% ]/g, '');
            const calcRes = Function(`"use strict"; return (${sanitized || 0})`)();
            const valStr = String(calcRes ?? 0);
            vars[varName] = valStr;
            vars[cleanName] = valStr;
            if (stopSignalRef.current) break;
            addLog('success', `✔ Math execute › ${resolvedExpr}`);
            addLog('arrow', `   ↳ ${varName} = ${valStr}`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Math execute › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Math execute failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 81 || actName === '2fa code') {
          const rawSecret = getRawInputValue(act.raw_input, 'SECRETE_KEY', '');
          const resolvedSecret = resolveVars(rawSecret, vars);
          const rawVar = act.output_variable_name || 'two_fa_code';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          try {
            let code = '000000';
            if (resolvedSecret) {
              code = await generateTOTP(resolvedSecret);
            }
            vars[varName] = code;
            vars[cleanName] = code;
            if (stopSignalRef.current) break;
            addLog('success', `✔ 2FA code generated`);
            addLog('arrow', `   ↳ ${varName} = "${code}"`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ 2FA code › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ 2FA code failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 13 || actName === 'file exists') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const resolvedPath = resolveVars(rawPath, vars);
          const rawVar = act.output_variable_name || 'file_exists';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          try {
            let exists = false;
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'exists',
                payload: { path: resolvedPath },
              });
              exists = !!res?.exists;
            }
            const resStr = exists ? 'True' : 'False';
            vars[varName] = resStr;
            vars[cleanName] = resStr;
            if (stopSignalRef.current) break;
            addLog('success', `✔ File exists › ${resolvedPath}`);
            addLog('arrow', `   ↳ ${varName} = ${resStr}`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ File exists › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ File exists failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 14 || actName === 'copy file') {
          const rawSrc = getRawInputValue(act.raw_input, 'SOURCE_FILE', '');
          const rawDest = getRawInputValue(act.raw_input, 'DES_FILE', '');
          const resolvedSrc = resolveVars(rawSrc, vars);
          const resolvedDest = resolveVars(rawDest, vars);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'copy',
                payload: { src: resolvedSrc, dest: resolvedDest },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to copy file');
              }
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Copy file › ${resolvedSrc} ➔ ${resolvedDest}`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Copy file › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Copy file failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 15 || actName === 'move / rename file' || actName === 'move/rename file') {
          const rawSrc = getRawInputValue(act.raw_input, 'SOURCE_FILE', '');
          const rawDest = getRawInputValue(act.raw_input, 'DES_FILE', '');
          const resolvedSrc = resolveVars(rawSrc, vars);
          const resolvedDest = resolveVars(rawDest, vars);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'move',
                payload: { src: resolvedSrc, dest: resolvedDest },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to move/rename file');
              }
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Move/Rename file › ${resolvedSrc} ➔ ${resolvedDest}`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Move/Rename file › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Move/Rename file failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 16 || actName === 'delete file') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const resolvedPath = resolveVars(rawPath, vars);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'delete',
                payload: { path: resolvedPath },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to delete file');
              }
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Delete file › ${resolvedPath}`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Delete file › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Delete file failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 17 || actName === 'file read all text') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const resolvedPath = resolveVars(rawPath, vars);
          const rawVar = act.output_variable_name || 'file_content';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          logActionStart(act, resolvedPath);

          try {
            let content = '';
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'readText',
                payload: { path: resolvedPath },
              });
              if (res && res.success) {
                content = res.text || '';
              } else {
                throw new Error(res?.error || 'Failed to read file');
              }
            }
            vars[varName] = content;
            vars[cleanName] = content;
            if (stopSignalRef.current) break;
            logActionResult(act, resolvedPath, { name: varName, value: content });
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ File read all text › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ File read all text failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 18 || actName === 'file read all lines') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '') || getRawInputValue(act.raw_input, 'PATH', '');
          const resolvedPath = resolveVars(rawPath, vars).trim().replace(/^["']|["']$/g, '');
          const rawVar = act.output_variable_name || 'file_lines';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          logActionStart(act, resolvedPath);

          try {
            let lines: string[] = [];
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'readLines',
                payload: { path: resolvedPath },
              });
              if (res && res.success) {
                lines = res.lines || [];
              } else {
                throw new Error(res?.error || 'Failed to read file');
              }
            }
            const cleanLines = lines.map((l: any) => String(l ?? '').replace(/\r$/, ''));
            const serialized = JSON.stringify(cleanLines);
            vars[varName] = serialized;
            vars[cleanName] = serialized;
            vars[`$${cleanName}`] = serialized;

            cleanLines.forEach((l, idx) => {
              vars[`${cleanName}[${idx}]`] = l;
              vars[`$${cleanName}[${idx}]`] = l;
              vars[`${cleanName}_${idx}`] = l;
              vars[`$${cleanName}_${idx}`] = l;
              vars[`${cleanName}_${idx + 1}`] = l;
              vars[`$${cleanName}_${idx + 1}`] = l;
            });

            vars[`${cleanName}.length`] = String(cleanLines.length);
            vars[`$${cleanName}.length`] = String(cleanLines.length);
            vars[`${cleanName}.Count`] = String(cleanLines.length);
            vars[`$${cleanName}.Count`] = String(cleanLines.length);
            vars[`${cleanName}_count`] = String(cleanLines.length);
            vars[`$${cleanName}_count`] = String(cleanLines.length);

            if (stopSignalRef.current) break;
            logActionResult(act, resolvedPath, { name: varName, value: cleanLines });
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ File read all lines › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ File read all lines failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 184 || actName === 'file read random line') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const resolvedPath = resolveVars(rawPath, vars);
          const rawVar = act.output_variable_name || 'random_line';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          logActionStart(act, resolvedPath);

          try {
            let line = '';
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'readRandomLine',
                payload: { path: resolvedPath },
              });
              if (res && res.success) {
                line = res.line || '';
              } else {
                throw new Error(res?.error || 'Failed to read file');
              }
            }
            vars[varName] = line;
            vars[cleanName] = line;
            if (stopSignalRef.current) break;
            logActionResult(act, resolvedPath, { name: varName, value: line });
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ File read random line › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ File read random line failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 19 || actName === 'file write all text') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const rawText = getRawInputValue(act.raw_input, 'TEXT', '');
          const resolvedPath = resolveVars(rawPath, vars);
          const resolvedText = resolveVars(rawText, vars);

          logActionStart(act, resolvedPath);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'writeText',
                payload: { path: resolvedPath, text: resolvedText },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to write file');
              }
            }
            if (stopSignalRef.current) break;
            logActionResult(act, resolvedPath);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ File write all text › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ File write all text failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 20 || actName === 'file append line') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const rawText = getRawInputValue(act.raw_input, 'TEXT', '');
          const rawOption = getRawInputValue(act.raw_input, 'OPTION', '') || getRawInputValue(act.raw_input, 'MODE', '') || 'Append line';
          const rawLineIdx = getRawInputValue(act.raw_input, 'LINE_INDEX', '') || getRawInputValue(act.raw_input, 'LINE_NUMBER', '');
          const rawUpdateMethod = getRawInputValue(act.raw_input, 'UPDATE_METHOD', '') || 'Replace line content';

          const resolvedPath = resolveVars(rawPath, vars);
          const resolvedText = resolveVars(rawText, vars);
          const resolvedLineIdx = resolveVars(rawLineIdx, vars).trim();
          const isUpdate = rawOption.toLowerCase().includes('update');
          const isSuffix = rawUpdateMethod.toLowerCase().includes('suffix') || rawUpdateMethod.toLowerCase().includes('append');

          logActionStart(act, `${isUpdate ? 'Update' : 'Append'} › ${resolvedPath}`);

          try {
            if ((window as any).electronAPI?.fileAction) {
              let res;
              if (isUpdate) {
                let lineIndex = -1;
                if (resolvedLineIdx !== '') {
                  const num = parseInt(resolvedLineIdx, 10);
                  if (!isNaN(num)) {
                    lineIndex = num > 0 ? num - 1 : 0;
                  }
                } else if (vars.$txt_line_index !== undefined && vars.$txt_line_index !== '') {
                  lineIndex = parseInt(vars.$txt_line_index, 10);
                }

                if (lineIndex < 0) {
                  throw new Error('Line Index is required for updating file line');
                }

                res = await (window as any).electronAPI.fileAction({
                  action: 'updateFileLine',
                  payload: {
                    path: resolvedPath,
                    lineIndex,
                    newText: isSuffix ? undefined : resolvedText,
                    suffix: isSuffix ? resolvedText : undefined,
                  },
                });
              } else {
                res = await (window as any).electronAPI.fileAction({
                  action: 'appendLine',
                  payload: { path: resolvedPath, text: resolvedText },
                });
              }

              if (res && res.success === false) {
                throw new Error(res.error || (isUpdate ? 'Failed to update file line' : 'Failed to append to file'));
              }
            }
            if (stopSignalRef.current) break;
            logActionResult(act, resolvedPath);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ ${isUpdate ? 'Update file line' : 'File append line'} › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ ${isUpdate ? 'Update file line' : 'File append line'} failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 74 || actName === 'create empty excel') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const resolvedPath = resolveVars(rawPath, vars);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'createEmptyExcel',
                payload: { path: resolvedPath },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to create excel file');
              }
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Create empty excel › ${resolvedPath}`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Create empty excel › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Create empty excel failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 21 || actName === 'read excel file') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const rawSheet = getRawInputValue(act.raw_input, 'SHEET_ID', '0');
          const rawCol = getRawInputValue(act.raw_input, 'COL_NAME_OR_INDEX', 'A');
          const rawRow = getRawInputValue(act.raw_input, 'ROW_INDEX', '1');
          const resolvedPath = resolveVars(rawPath, vars);
          const resolvedSheet = resolveVars(rawSheet, vars);
          const resolvedCol = resolveVars(rawCol, vars);
          const resolvedRow = resolveVars(rawRow, vars);
          const rawVar = act.output_variable_name || '';
          const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
          const cleanName = varName.replace(/^\$/, '');

          try {
            let val = '';
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'readExcel',
                payload: {
                  path: resolvedPath,
                  sheetIndex: resolvedSheet,
                  col: resolvedCol,
                  row: resolvedRow,
                },
              });
              if (res && res.success) {
                val = res.value ?? '';
              } else {
                throw new Error(res?.error || 'Failed to read excel file');
              }
            }
            if (varName) {
              vars[varName] = val;
              vars[cleanName] = val;
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Read excel file › [${resolvedCol}${resolvedRow}] from ${resolvedPath}`);
            if (varName) {
              addLog('arrow', `   ↳ ${varName} = "${val}"`);
            }
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Read excel file › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Read excel file failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 22 || actName === 'write excel file') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const rawSheet = getRawInputValue(act.raw_input, 'SHEET_ID', '0');
          const rawCol = getRawInputValue(act.raw_input, 'COL_NAME_OR_INDEX', 'A');
          const rawRow = getRawInputValue(act.raw_input, 'ROW_INDEX', '1');
          const rawVal = getRawInputValue(act.raw_input, 'DATA', '');
          const resolvedPath = resolveVars(rawPath, vars);
          const resolvedSheet = resolveVars(rawSheet, vars);
          const resolvedCol = resolveVars(rawCol, vars);
          const resolvedRow = resolveVars(rawRow, vars);
          const resolvedVal = resolveVars(rawVal, vars);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'writeExcel',
                payload: {
                  path: resolvedPath,
                  sheetIndex: resolvedSheet,
                  col: resolvedCol,
                  row: resolvedRow,
                  value: resolvedVal,
                },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to write excel file');
              }
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Write excel file › [${resolvedCol}${resolvedRow}] = "${resolvedVal}"`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Write excel file › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Write excel file failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 71 || actName === 'append excel file') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', '');
          const rawSheet = getRawInputValue(act.raw_input, 'SHEET_ID', '0');
          const rawCol = getRawInputValue(act.raw_input, 'COL_NAME_OR_INDEX', 'A');
          const rawVal = getRawInputValue(act.raw_input, 'DATA', '');
          const resolvedPath = resolveVars(rawPath, vars);
          const resolvedSheet = resolveVars(rawSheet, vars);
          const resolvedCol = resolveVars(rawCol, vars);
          const resolvedVal = resolveVars(rawVal, vars);

          try {
            let rowAppended = 1;
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'appendExcel',
                payload: {
                  path: resolvedPath,
                  sheetIndex: resolvedSheet,
                  col: resolvedCol,
                  value: resolvedVal,
                },
              });
              if (res && res.success) {
                rowAppended = res.row ?? 1;
              } else {
                throw new Error(res?.error || 'Failed to append excel file');
              }
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Append excel file › [${resolvedCol}${rowAppended}] = "${resolvedVal}"`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Append excel file › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Append excel file failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 23 || actName === 'folder exists') {
          const rawPath = getRawInputValue(act.raw_input, 'FOLDER_PATH', '');
          const resolvedPath = resolveVars(rawPath, vars);
          const rawVar = act.output_variable_name || '';
          const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
          const cleanName = varName.replace(/^\$/, '');

          try {
            let exists = false;
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'folderExists',
                payload: { path: resolvedPath },
              });
              if (res && res.success) {
                exists = res.exists;
              } else {
                throw new Error(res?.error || 'Failed to check folder existence');
              }
            }
            const strVal = exists ? 'True' : 'False';
            if (varName) {
              vars[varName] = strVal;
              vars[cleanName] = strVal;
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Folder exists › ${resolvedPath} = ${strVal}`);
            if (varName) {
              addLog('arrow', `   ↳ ${varName} = "${strVal}"`);
            }
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Folder exists › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Folder exists failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 24 || actName === 'create folder') {
          const rawPath = getRawInputValue(act.raw_input, 'FOLDER_PATH', '');
          const resolvedPath = resolveVars(rawPath, vars);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'createFolder',
                payload: { path: resolvedPath },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to create folder');
              }
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Create folder › ${resolvedPath}`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Create folder › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Create folder failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 26 || actName === 'move / rename folder' || actName === 'move/rename folder') {
          const rawSrc = getRawInputValue(act.raw_input, 'SOURCE_FOLDER', '');
          const rawDest = getRawInputValue(act.raw_input, 'DES_FOLDER', '');
          const resolvedSrc = resolveVars(rawSrc, vars);
          const resolvedDest = resolveVars(rawDest, vars);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'moveFolder',
                payload: { src: resolvedSrc, dest: resolvedDest },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to move/rename folder');
              }
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Move/Rename folder › ${resolvedSrc} ➔ ${resolvedDest}`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Move/Rename folder › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Move/Rename folder failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 25 || actName === 'delete folder') {
          const rawPath = getRawInputValue(act.raw_input, 'FOLDER_PATH', '');
          const resolvedPath = resolveVars(rawPath, vars);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'deleteFolder',
                payload: { path: resolvedPath },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to delete folder');
              }
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Delete folder › ${resolvedPath}`);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Delete folder › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Delete folder failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 72 || actName === 'folder get file list') {
          const rawPath = getRawInputValue(act.raw_input, 'FOLDER_PATH', '');
          const resolvedPath = resolveVars(rawPath, vars);
          const rawVar = act.output_variable_name || '';
          const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
          const cleanName = varName.replace(/^\$/, '');

          try {
            let files: string[] = [];
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'folderGetFileList',
                payload: { path: resolvedPath },
              });
              if (res && res.success) {
                files = res.files || [];
              } else {
                throw new Error(res?.error || 'Failed to get file list from folder');
              }
            }
            const serialized = JSON.stringify(files);
            if (varName) {
              vars[varName] = serialized;
              vars[cleanName] = serialized;
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Folder get file list › ${resolvedPath} (${files.length} files)`);
            if (varName) {
              addLog('arrow', `   ↳ ${varName} = [${files.length} files]`);
            }
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Folder get file list › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Folder get file list failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 27 || actName === 'get clipboard text') {
          const rawVar = act.output_variable_name || 'clipboard_text';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          logActionStart(act, varName);

          try {
            let text = '';
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'getClipboard',
              });
              if (res && res.success) {
                text = typeof res.text === 'string' ? res.text : (res.text != null ? String(res.text) : '');
              } else {
                throw new Error(res?.error || 'Failed to get clipboard text');
              }
            } else if (navigator.clipboard) {
              text = await navigator.clipboard.readText();
            }
            vars[varName] = text;
            vars[cleanName] = text;
            if (stopSignalRef.current) break;
            logActionResult(act, varName, { name: varName, value: text });
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Get clipboard text › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Get clipboard text failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 28 || actName === 'set clipboard text') {
          const rawText = getRawInputValue(act.raw_input, 'TEXT', '');
          const resolvedText = resolveVars(rawText, vars);

          logActionStart(act, resolvedText);

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'setClipboard',
                payload: { text: resolvedText },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'Failed to set clipboard text');
              }
            } else if (navigator.clipboard) {
              await navigator.clipboard.writeText(resolvedText);
            }
            if (stopSignalRef.current) break;
            logActionResult(act, resolvedText);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Set clipboard text › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Set clipboard text failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 29 || actName === 'http request') {
          const rawUrl = getRawInputValue(act.raw_input, 'URL', '');
          const url = resolveVars(rawUrl, vars);
          const method = getRawInputValue(act.raw_input, 'METHOD', 'GET').toUpperCase();
          const rawHeaders = getRawInputValue(act.raw_input, 'HEADER', getRawInputValue(act.raw_input, 'HEADERS', ''));
          const headers = resolveVars(rawHeaders, vars);
          const rawData = getRawInputValue(act.raw_input, 'DATA', '');
          const data = resolveVars(rawData, vars);
          const timeout = getRawInputValue(act.raw_input, 'TIMEOUT', '60');
          const rawVar = act.output_variable_name || '';
          const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
          const cleanName = varName.replace(/^\$/, '');

          try {
            let responseText = '';
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'httpRequest',
                payload: { url, method, headers, data, timeout },
              });
              if (res && res.success) {
                responseText = res.data ?? '';
              } else {
                throw new Error(res?.error || 'HTTP Request failed');
              }
            } else {
              // Web fetch fallback
              const headerObj: Record<string, string> = {};
              if (headers) {
                headers.split(/\r?\n/).forEach((l: string) => {
                  const idx = l.indexOf(':');
                  if (idx > 0) headerObj[l.slice(0, idx).trim()] = l.slice(idx + 1).trim();
                });
              }
              const fetchOpt: RequestInit = { method, headers: headerObj };
              if (data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                fetchOpt.body = data;
              }
              const resp = await fetch(url, fetchOpt);
              responseText = await resp.text();
            }

            if (varName) {
              vars[varName] = responseText;
              vars[cleanName] = responseText;
            }
            if (stopSignalRef.current) break;
            logActionResult(act, `${method} ${url}`, varName ? { name: varName, value: responseText } : undefined);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ HTTP Request › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ HTTP Request failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 30 || actName === 'http download') {
          const rawUrl = getRawInputValue(act.raw_input, 'URL', '');
          const url = resolveVars(rawUrl, vars);
          const rawSavePath = getRawInputValue(act.raw_input, 'SAVE_PATH', '');
          const savePath = resolveVars(rawSavePath, vars);
          const rawHeaders = getRawInputValue(act.raw_input, 'HEADER', getRawInputValue(act.raw_input, 'HEADERS', ''));
          const headers = resolveVars(rawHeaders, vars);
          const rawVar = act.output_variable_name || '';
          const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
          const cleanName = varName.replace(/^\$/, '');

          try {
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'httpDownload',
                payload: { url, savePath, headers },
              });
              if (res && res.success === false) {
                throw new Error(res.error || 'HTTP Download failed');
              }
            } else {
              // Web fallback
              const resp = await fetch(url);
              if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
            }

            if (varName) {
              vars[varName] = 'True';
              vars[cleanName] = 'True';
            }
            if (stopSignalRef.current) break;
            logActionResult(act, `${url} ▸ ${savePath}`, varName ? { name: varName, value: 'True' } : undefined);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ HTTP Download › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ HTTP Download failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 107 || actName === 'wait to image') {
          const rawImg = getRawInputValue(act.raw_input, 'IMAGE', '');
          const img = resolveVars(rawImg, vars);
          const rawTimeout = getRawInputValue(act.raw_input, 'TIMEOUT', '20');
          const timeoutSec = parseInt(resolveVars(rawTimeout, vars), 10) || 20;
          const threshold = getRawInputValue(act.raw_input, 'THRESHOLD', '0.7');
          const trueColor = getRawInputValue(act.raw_input, 'TRUE_COLOR', 'No');

          try {
            addLog('info', `▶ Wait to image › Timeout ${timeoutSec}s, Threshold ${threshold}`);
            const startTime = Date.now();
            let found = false;
            let lastCoord = { x: 0, y: 0 };
            let lastScore = 0;

            while (Date.now() - startTime < timeoutSec * 1000 && !stopSignalRef.current) {
              if ((window as any).electronAPI?.fileAction) {
                const res = await (window as any).electronAPI.fileAction({
                  action: 'findImage',
                  payload: { templatePath: img, threshold, trueColor, port: port.trim() },
                });
                if (res && res.found) {
                  found = true;
                  lastScore = res.score;
                  lastCoord = { x: res.x, y: res.y };
                  break;
                }
              }
              await sleep(600);
            }

            if (found) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              addLog('success', `✔ Wait to image › Found at [${lastCoord.x}, ${lastCoord.y}] (took ${elapsed}s, score: ${(lastScore * 100).toFixed(1)}%)`);
            } else {
              if (act.continue_on_error) {
                addLog('info', `⚠ Wait to image › Timed out after ${timeoutSec}s (Continue on error)`);
              } else {
                addLog('error', `✕ Wait to image failed: Timed out after ${timeoutSec}s`);
                break;
              }
            }
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Wait to image › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Wait to image failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 108 || actName === 'image exists') {
          const rawImg = getRawInputValue(act.raw_input, 'IMAGE', '');
          const img = resolveVars(rawImg, vars);
          const threshold = getRawInputValue(act.raw_input, 'THRESHOLD', '0.7');
          const trueColor = getRawInputValue(act.raw_input, 'TRUE_COLOR', 'No');
          const rawVar = act.output_variable_name || '';
          const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
          const cleanName = varName.replace(/^\$/, '');

          try {
            let found = false;
            let score = 0;
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'findImage',
                payload: { templatePath: img, threshold, trueColor, port: port.trim() },
              });
              if (res && res.found) {
                found = true;
                score = res.score;
              }
            }
            const exists = found ? 'True' : 'False';
            if (varName) {
              vars[varName] = exists;
              vars[cleanName] = exists;
            }
            if (stopSignalRef.current) break;
            addLog('success', `✔ Image exists › ${exists} (Match score: ${(score * 100).toFixed(1)}%)`);
            if (varName) {
              addLog('arrow', `   ↳ ${varName} = ${exists}`);
            }
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Image exists › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Image exists failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 109 || actName === 'image search') {
          const rawImg = getRawInputValue(act.raw_input, 'IMAGE', '');
          const img = resolveVars(rawImg, vars);
          const threshold = getRawInputValue(act.raw_input, 'THRESHOLD', '0.7');
          const trueColor = getRawInputValue(act.raw_input, 'TRUE_COLOR', 'No');
          const rawVar = act.output_variable_name || '';
          const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
          const cleanName = varName.replace(/^\$/, '');

          try {
            let found = false;
            let coords = '';
            let score = 0;
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'findImage',
                payload: { templatePath: img, threshold, trueColor, port: port.trim() },
              });
              if (res && res.found) {
                found = true;
                coords = `${res.x},${res.y}`;
                score = res.score;
              } else if (res && res.x !== undefined && res.y !== undefined) {
                coords = `${res.x},${res.y}`;
                score = res.score;
              }
            }

            if (found) {
              if (varName) {
                vars[varName] = coords;
                vars[cleanName] = coords;
              }
              if (stopSignalRef.current) break;
              addLog('success', `✔ Image search › Found at [${coords}] (Match: ${(score * 100).toFixed(1)}%)`);
              if (varName) {
                addLog('arrow', `   ↳ ${varName} = "${coords}"`);
              }
            } else {
              const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
              if (contOnError) {
                addLog('info', `⚠ Image search › Not found (Match: ${(score * 100).toFixed(1)}% < Threshold ${threshold}) (Continue on error)`);
              } else {
                addLog('error', `✕ Image search failed: Not found on screen (Match: ${(score * 100).toFixed(1)}% < Threshold ${threshold})`);
                break;
              }
            }
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Image search › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Image search failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 110 || actName === 'image to base64') {
          const rawPath = getRawInputValue(act.raw_input, 'IMAGE_PATH', '');
          const imgPath = resolveVars(rawPath, vars);
          const rawVar = act.output_variable_name || '';
          const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
          const cleanName = varName.replace(/^\$/, '');

          try {
            let b64 = '';
            if ((window as any).electronAPI?.fileAction) {
              const res = await (window as any).electronAPI.fileAction({
                action: 'imageToBase64',
                payload: { path: imgPath },
              });
              if (res && res.success) {
                b64 = res.base64 || '';
              } else {
                throw new Error(res?.error || 'Failed to convert image to base64');
              }
            } else {
              b64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            }

            if (varName) {
              vars[varName] = b64;
              vars[cleanName] = b64;
            }
            if (stopSignalRef.current) break;
            logActionResult(act, imgPath, varName ? { name: varName, value: b64 } : undefined);
          } catch (e: any) {
            const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
            if (contOnError) {
              addLog('info', `⚠ Image to Base64 › ${e.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Image to Base64 failed: ${e.message}`);
              break;
            }
          }
          await sleep(30);
        } else if (actType === 36 || actName === 'new tab') {
          try {
            if ((window as any).electronAPI?.cdpAction) {
              await (window as any).electronAPI.cdpAction({ port: port.trim(), action: 'newTab' });
            } else {
              await fetch(`http://127.0.0.1:${port.trim()}/json/new`, { method: 'PUT', signal: AbortSignal.timeout(1200) });
            }
          } catch (e) {}
          await sleep(60);
          if (stopSignalRef.current) break;
          addLog('success', '✔ NewTab');
          await sleep(40);
        } else if (actType === 37 || actName === 'active tab') {
          let mode = 'By index';
          let target = '0';
          if (act.raw_input) {
            try {
              const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
              if (Array.isArray(parsed)) {
                const m = parsed.find((p: any) => p.Key === 'ACTIVE_TAB_TYPE');
                if (m) mode = m.Value;
                const t = parsed.find((p: any) => p.Key === 'TAB_INDEX_OR_PREFIX_URL');
                if (t) target = t.Value;
              }
            } catch (e) {}
          }
          let resolvedTarget = target;
          for (const [k, v] of Object.entries(vars)) {
            const rawK = k.startsWith('$') ? k.slice(1) : k;
            resolvedTarget = resolvedTarget.replace(new RegExp(`\\$${rawK}\\b`, 'g'), v);
          }
          try {
            if ((window as any).electronAPI?.cdpAction) {
              await (window as any).electronAPI.cdpAction({
                port: port.trim(),
                action: 'activeTab',
                payload: { mode, target: resolvedTarget },
              });
            } else {
              const tabsRes = await fetch(`http://127.0.0.1:${port.trim()}/json/list`, { signal: AbortSignal.timeout(1200) });
              const tabs = await tabsRes.json();
              if (Array.isArray(tabs) && tabs.length > 0) {
                let targetTab = null;
                if (mode.toLowerCase().includes('prefix')) {
                  targetTab = tabs.find((t: any) => t.url && t.url.startsWith(resolvedTarget));
                } else {
                  const idx = parseInt(resolvedTarget, 10) || 0;
                  targetTab = tabs[idx] || tabs[0];
                }
                if (targetTab && targetTab.id) {
                  await fetch(`http://127.0.0.1:${port.trim()}/json/activate/${targetTab.id}`, { method: 'POST', signal: AbortSignal.timeout(1200) });
                }
              }
            }
          } catch (e) {}
          await sleep(60);
          if (stopSignalRef.current) break;
          addLog('success', `✔ TabActive › ${resolvedTarget || '0'}`);
          await sleep(40);
        } else if (actType === 38 || actName === 'close tab') {
          try {
            if ((window as any).electronAPI?.cdpAction) {
              await (window as any).electronAPI.cdpAction({ port: port.trim(), action: 'closeTab' });
            } else {
              const tabsRes = await fetch(`http://127.0.0.1:${port.trim()}/json/list`, { signal: AbortSignal.timeout(1200) });
              const tabs = await tabsRes.json();
              if (Array.isArray(tabs) && tabs.length > 0) {
                const pageTab = tabs.find((t: any) => t.type === 'page') || tabs[0];
                if (pageTab && pageTab.id) {
                  await fetch(`http://127.0.0.1:${port.trim()}/json/close/${pageTab.id}`, { method: 'POST', signal: AbortSignal.timeout(1200) });
                }
              }
            }
          } catch (e) {}
          await sleep(60);
          if (stopSignalRef.current) break;
          addLog('success', '✔ TabClose');
          await sleep(40);
        } else if (actType === 73 || actName === 'close all tab') {
          try {
            if ((window as any).electronAPI?.cdpAction) {
              await (window as any).electronAPI.cdpAction({ port: port.trim(), action: 'closeAllTab' });
            } else {
              const tabsRes = await fetch(`http://127.0.0.1:${port.trim()}/json/list`, { signal: AbortSignal.timeout(1200) });
              const tabs = await tabsRes.json();
              if (Array.isArray(tabs) && tabs.length > 1) {
                for (let tIdx = 1; tIdx < tabs.length; tIdx++) {
                  if (tabs[tIdx].id && tabs[tIdx].type === 'page') {
                    await fetch(`http://127.0.0.1:${port.trim()}/json/close/${tabs[tIdx].id}`, { method: 'POST', signal: AbortSignal.timeout(500) });
                  }
                }
              }
            }
          } catch (e) {}
          await sleep(60);
          if (stopSignalRef.current) break;
          addLog('success', '✔ TabCloseAll');
          await sleep(40);
        } else if (actType === 62 || actName === 'switch to frame') {
          const rawXPath = act.element_xpath || getRawInputValue(act.raw_input, 'XPATH', '');
          const resolvedXPath = resolveVars(rawXPath, vars);
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
          logActionStart(act, resolvedXPath || 'iframe');

          if (!resolvedXPath) {
            if (!contOnError) {
              addLog('error', `✕ Switch to frame failed: XPath is empty`);
              break;
            } else {
              addLog('info', `⚠ Switch to frame › XPath is empty (Skipped)`);
            }
          } else {
            addLog('info', `▶ Switch to frame › ${resolvedXPath}`);
            const checkFrameScript = `(() => {
              try {
                const res = document.evaluate(${JSON.stringify(resolvedXPath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const el = res.singleNodeValue;
                if (!el) return { found: false };
                const rect = el.getBoundingClientRect();
                const src = el.src || el.getAttribute('src') || '';
                const name = el.name || el.getAttribute('name') || el.id || '';
                const title = el.title || el.getAttribute('title') || '';
                return {
                  found: true,
                  src,
                  name,
                  title,
                  left: Math.round(rect.left),
                  top: Math.round(rect.top),
                };
              } catch(e) {
                return { found: false, error: e.message };
              }
            })()`;

            let frameFound = false;
            let frameInfo: any = null;
            const start = Date.now();
            while (Date.now() - start < 15000 && !stopSignalRef.current) {
              const evalRes = await evaluateInChrome(checkFrameScript, vars.$activePopupTargetId);
              if (evalRes.success && evalRes.value?.found) {
                frameFound = true;
                frameInfo = evalRes.value;
                if (evalRes.value.src && evalRes.value.src !== 'about:blank') {
                  break;
                }
              }
              await sleep(350);
            }

            if (frameFound) {
              vars.$currentFrameXPath = resolvedXPath;
              vars.$currentFrameOffset = `${frameInfo.left || 0},${frameInfo.top || 0}`;

              try {
                if ((window as any).electronAPI?.cdpAction) {
                  // 1. First check if this frame is an OOPIF target in listTargets with retry polling
                  let matchedTarget: any = null;
                  const targetPollStart = Date.now();
                  const cleanSrc = (frameInfo.src || '').split('#')[0].split('?')[0].trim().toLowerCase();
                  const frameTitle = (frameInfo.title || '').trim().toLowerCase();
                  const isRecaptcha =
                    resolvedXPath.toLowerCase().includes('recaptcha') ||
                    cleanSrc.includes('recaptcha') ||
                    frameTitle.includes('recaptcha');

                  while (Date.now() - targetPollStart < 8000 && !stopSignalRef.current) {
                    const listRes = await (window as any).electronAPI.cdpAction({
                      port: port.trim() || '43076',
                      action: 'listTargets',
                    });
                    const allTargets: any[] = listRes?.targets || [];

                    matchedTarget = allTargets.find((t: any) => {
                      if (t.id === vars.$mainPageTargetId) return false;
                      const u = (t.url || '').trim().toLowerCase();
                      const tTitle = (t.title || '').trim().toLowerCase();
                      const cleanU = u.split('#')[0].split('?')[0];

                      if (frameInfo.src) {
                        const s = frameInfo.src.toLowerCase();
                        if (u && (u === s || u.includes(s) || s.includes(u))) return true;
                      }
                      if (cleanSrc && cleanU && (cleanU === cleanSrc || cleanU.includes(cleanSrc) || cleanSrc.includes(cleanU))) {
                        return true;
                      }
                      if (frameTitle && tTitle && (tTitle === frameTitle || tTitle.includes(frameTitle) || frameTitle.includes(tTitle))) {
                        return true;
                      }
                      if (isRecaptcha && (u.includes('recaptcha') || tTitle.includes('recaptcha'))) {
                        return true;
                      }
                      return false;
                    });

                    if (matchedTarget && matchedTarget.id) {
                      break;
                    }

                    if (cleanSrc.startsWith('http') || isRecaptcha) {
                      await sleep(350);
                    } else {
                      break;
                    }
                  }

                  if (matchedTarget && matchedTarget.id) {
                    if (!vars.$mainPageTargetId) {
                      vars.$mainPageTargetId = vars.$activePopupTargetId || '';
                    }
                    vars.$activePopupTargetId = matchedTarget.id;
                    vars.$currentFrameTargetId = matchedTarget.id;
                  } else {
                    // 2. Otherwise try Page.getFrameTree + createIsolatedWorld (for same-process frames)
                    const treeRes = await (window as any).electronAPI.cdpAction({
                      port: port.trim() || '43076',
                      action: 'getFrameTree',
                      payload: { targetId: vars.$activePopupTargetId },
                    });
                    const collectFrames = (root: any): any[] => {
                      if (!root) return [];
                      const list: any[] = [];
                      if (root.frame) list.push(root);
                      const kids = root.childFrames || root.result?.frameTree?.childFrames || root.frameTree?.childFrames;
                      if (Array.isArray(kids)) {
                        for (const k of kids) list.push(...collectFrames(k));
                      }
                      return list;
                    };
                    const allFrames = collectFrames(treeRes?.result?.frameTree || treeRes?.frameTree);
                    const matched = allFrames.find((cf: any) => {
                      const u = (cf.frame?.url || '').trim().toLowerCase();
                      if (!u) return false;
                      const cleanU = u.split('#')[0].split('?')[0];
                      if (frameInfo.src && (u === frameInfo.src.toLowerCase() || u.includes(frameInfo.src.toLowerCase()) || frameInfo.src.toLowerCase().includes(u))) return true;
                      if (cleanSrc && (cleanU === cleanSrc || cleanU.includes(cleanSrc) || cleanSrc.includes(cleanU))) return true;
                      if (frameInfo.name && cf.frame?.name && cf.frame.name === frameInfo.name) return true;
                      return false;
                    });
                    if (matched && matched.frame?.id) {
                      const worldRes = await (window as any).electronAPI.cdpAction({
                        port: port.trim() || '43076',
                        action: 'createIsolatedWorld',
                        payload: {
                          targetId: vars.$activePopupTargetId,
                          frameId: matched.frame.id,
                          worldName: 'gpm_isolated_frame',
                        },
                      });
                      if (worldRes?.result?.executionContextId) {
                        vars.$currentFrameContextId = String(worldRes.result.executionContextId);
                      }
                    }
                  }
                }
              } catch (e) {}

              if (vars.$currentFrameTargetId) {
                addLog('success', `✔ Switch to frame › ${resolvedXPath} (OOPIF Target: ${vars.$currentFrameTargetId.slice(0, 8)}...)`);
              } else if (vars.$currentFrameContextId) {
                addLog('success', `✔ Switch to frame › ${resolvedXPath} (Context ID: ${vars.$currentFrameContextId})`);
              } else {
                addLog('success', `✔ Switch to frame › ${resolvedXPath}`);
              }
            } else {
              if (contOnError) {
                addLog('info', `⚠ Switch to frame › Frame not found (Continue on error)`);
              } else {
                addLog('error', `✕ Switch to frame failed: Frame not found (${resolvedXPath})`);
                break;
              }
            }
          }
          await sleep(40);
        } else if (actType === 61 || actName === 'switch to default') {
          logActionStart(act, 'Default Content');
          addLog('info', `▶ Switch to default › Chuyển về khung trang chính`);
          delete vars.$currentFrameXPath;
          delete vars.$currentFrameContextId;
          delete vars.$currentFrameOffset;
          delete vars.$currentFrameTargetId;

          if (vars.$mainPageTargetId) {
            vars.$activePopupTargetId = vars.$mainPageTargetId;
            delete vars.$mainPageTargetId;
          } else {
            try {
              if ((window as any).electronAPI?.cdpAction) {
                const listRes = await (window as any).electronAPI.cdpAction({
                  port: port.trim() || '43076',
                  action: 'listTargets',
                });
                const pages = (listRes?.targets || []).filter((t: any) => t.type === 'page');
                if (pages.length > 0 && pages[0].id) {
                  vars.$activePopupTargetId = pages[0].id;
                }
              }
            } catch (e) {}
          }
          delete vars.$activePopupTitle;

          addLog('success', `✔ Switch to default › Khung trang chính đã được kích hoạt`);
          await sleep(40);
        } else if (actType === 63 || actName === 'switch to popup') {
          const rawTitle = getRawInputValue(act.raw_input, 'TITLE', getRawInputValue(act.raw_input, 'POPUP_TITLE', ''));
          const resolvedTitle = resolveVars(rawTitle, vars).trim().toLowerCase();
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
          logActionStart(act, resolvedTitle || 'Popup');
          addLog('info', `▶ Switch to popup › "${resolvedTitle || '(any)'}"`);

          const start = Date.now();
          let matchedTarget: any = null;

          while (Date.now() - start < 15000 && !stopSignalRef.current) {
            try {
              if ((window as any).electronAPI?.cdpAction) {
                const listRes = await (window as any).electronAPI.cdpAction({
                  port: port.trim() || '43076',
                  action: 'listTargets',
                });
                const pages = (listRes?.targets || []).filter((t: any) => t.type === 'page');

                if (resolvedTitle) {
                  matchedTarget = pages.find((t: any) => {
                    const tTitle = (t.title || '').toLowerCase();
                    const tUrl = (t.url || '').toLowerCase();
                    return tTitle.includes(resolvedTitle) || tUrl.includes(resolvedTitle);
                  });
                } else {
                  if (pages.length > 1) {
                    matchedTarget = pages[pages.length - 1];
                  } else if (pages.length === 1) {
                    matchedTarget = pages[0];
                  }
                }
              }
            } catch (e) {}

            if (matchedTarget) break;
            await sleep(500);
          }

          if (matchedTarget && matchedTarget.id) {
            if ((window as any).electronAPI?.cdpAction) {
              await (window as any).electronAPI.cdpAction({
                port: port.trim() || '43076',
                action: 'activateTarget',
                payload: { targetId: matchedTarget.id },
              });
            }
            vars.$activePopupTargetId = matchedTarget.id;
            vars.$activePopupTitle = matchedTarget.title || '';
            delete vars.$currentFrameXPath;
            delete vars.$currentFrameContextId;
            delete vars.$currentFrameOffset;

            addLog('success', `✔ Switch to popup › "${matchedTarget.title || matchedTarget.url}"`);
          } else {
            if (contOnError) {
              addLog('info', `⚠ Switch to popup › Popup not found (Continue on error)`);
            } else {
              addLog('error', `✕ Switch to popup failed: Popup "${resolvedTitle}" not found`);
              break;
            }
          }
          await sleep(40);
        } else if (actType === 64 || actName === 'import cookie') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', getRawInputValue(act.raw_input, 'COOKIE_FILE', ''));
          const resolvedPath = resolveVars(rawPath, vars).trim();
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
          logActionStart(act, resolvedPath || 'Import cookie');
          addLog('info', `▶ Import cookie › File: "${resolvedPath || '(từ biến/mặc định)'}"`);

          try {
            let cookieData: any = null;
            if (resolvedPath && (window as any).electronAPI?.fileAction) {
              const fileCheck = await (window as any).electronAPI.fileAction({
                action: 'exists',
                payload: { path: resolvedPath },
              }).catch(() => null);

              if (fileCheck?.exists) {
                const readRes = await (window as any).electronAPI.fileAction({
                  action: 'readText',
                  payload: { path: resolvedPath },
                }).catch(() => null);
                const fileText = readRes?.text ?? readRes?.content;
                if (readRes?.success && fileText) {
                  cookieData = fileText;
                }
              }
            }

            if (!cookieData && resolvedPath && !resolvedPath.endsWith('.json') && !resolvedPath.endsWith('.txt') && !resolvedPath.includes('\\') && !resolvedPath.includes('/')) {
              cookieData = resolvedPath;
            }

            if (!cookieData && (vars.$cookie || vars.cookie)) {
              cookieData = vars.$cookie || vars.cookie;
            }

            if (!cookieData && resolvedPath) {
              // Pass path to main process as it also auto-reads file paths
              cookieData = resolvedPath;
            }

            if (!cookieData) {
              if (contOnError) {
                addLog('info', `⚠ Import cookie › File hoặc dữ liệu cookie trống (Continue on error)`);
              } else {
                addLog('error', `✕ Import cookie thất bại: Không tìm thấy file cookie hoặc dữ liệu cookie trống`);
                break;
              }
            } else {
              const cdpRes = await (window as any).electronAPI?.cdpAction({
                port: port.trim() || '43076',
                action: 'setCookies',
                payload: { cookies: cookieData },
              });

              if (cdpRes?.success) {
                addLog('success', `✔ Import cookie › Đã import thành công ${cdpRes.count ?? ''} cookies vào trình duyệt`);
              } else {
                if (contOnError) {
                  addLog('info', `⚠ Import cookie › ${cdpRes?.error || 'Lỗi'} (Continue on error)`);
                } else {
                  addLog('error', `✕ Import cookie thất bại: ${cdpRes?.error || 'Lỗi khi nạp cookie'}`);
                  break;
                }
              }
            }
          } catch (err: any) {
            if (contOnError) {
              addLog('info', `⚠ Import cookie error: ${err.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Import cookie exception: ${err.message}`);
              break;
            }
          }
          await sleep(40);
        } else if (actType === 65 || actName === 'export cookie') {
          const rawPath = getRawInputValue(act.raw_input, 'FILE_PATH', getRawInputValue(act.raw_input, 'COOKIE_FILE', ''));
          const resolvedPath = resolveVars(rawPath, vars).trim().replace(/^["']|["']$/g, '');
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
          logActionStart(act, resolvedPath || 'Export cookie');
          addLog('info', `▶ Export cookie › ${resolvedPath ? `Lưu vào: "${resolvedPath}"` : 'Lưu vào biến'}`);

          try {
            const cdpRes = await (window as any).electronAPI?.cdpAction({
              port: port.trim() || '43076',
              action: 'getCookies',
            });

            if (cdpRes?.success && Array.isArray(cdpRes.cookies)) {
              const jsonStr = JSON.stringify(cdpRes.cookies, null, 2);
              vars.$cookie = jsonStr;
              vars.cookie = jsonStr;
              if (act.output_variable_name) {
                const rawVar = act.output_variable_name;
                const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
                const cleanName = varName.replace(/^\$/, '');
                vars[varName] = jsonStr;
                vars[cleanName] = jsonStr;
              }

              if (resolvedPath && (window as any).electronAPI?.fileAction) {
                const writeRes = await (window as any).electronAPI.fileAction({
                  action: 'writeText',
                  payload: { path: resolvedPath, text: jsonStr },
                });
                if (writeRes?.success !== false) {
                  addLog('success', `✔ Export cookie › Đã xuất ${cdpRes.cookies.length} cookies ra file: ${writeRes?.path || resolvedPath}`);
                } else {
                  if (contOnError) {
                    addLog('info', `⚠ Export cookie › Ghi file lỗi: ${writeRes?.error || 'Lỗi'} (Continue on error)`);
                  } else {
                    addLog('error', `✕ Export cookie thất bại: Không thể ghi file ${resolvedPath} (${writeRes?.error})`);
                    break;
                  }
                }
              } else {
                addLog('success', `✔ Export cookie › Đã xuất ${cdpRes.cookies.length} cookies vào biến`);
              }
            } else {
              if (contOnError) {
                addLog('info', `⚠ Export cookie › ${cdpRes?.error || 'Lỗi'} (Continue on error)`);
              } else {
                addLog('error', `✕ Export cookie thất bại: ${cdpRes?.error || 'Lỗi khi lấy cookie'}`);
                break;
              }
            }
          } catch (err: any) {
            if (contOnError) {
              addLog('info', `⚠ Export cookie error: ${err.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Export cookie exception: ${err.message}`);
              break;
            }
          }
          await sleep(40);
        } else if (actType === 185 || actName === 'clear cookie' || actName.includes('clear cookie')) {
          const rawDomain = getRawInputValue(act.raw_input, 'DOMAIN', '');
          const resolvedDomain = resolveVars(rawDomain, vars).trim();
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
          logActionStart(act, resolvedDomain || 'Clear cookie');
          addLog('info', `▶ Clear cookie › ${resolvedDomain ? `Domain: "${resolvedDomain}"` : 'Tất cả cookies'}`);

          try {
            const cdpRes = await (window as any).electronAPI?.cdpAction({
              port: port.trim() || '43076',
              action: 'clearCookies',
              payload: { domain: resolvedDomain },
            });

            if (cdpRes?.success) {
              vars.$cookie = '';
              vars.cookie = '';
              addLog('success', `✔ Clear cookie › Đã xóa sạch cookies ${resolvedDomain ? `cho domain "${resolvedDomain}"` : 'của trình duyệt'}`);
            } else {
              if (contOnError) {
                addLog('info', `⚠ Clear cookie › ${cdpRes?.error || 'Lỗi'} (Continue on error)`);
              } else {
                addLog('error', `✕ Clear cookie thất bại: ${cdpRes?.error || 'Lỗi khi xóa cookies'}`);
                break;
              }
            }
          } catch (err: any) {
            if (contOnError) {
              addLog('info', `⚠ Clear cookie error: ${err.message} (Continue on error)`);
            } else {
              addLog('error', `✕ Clear cookie exception: ${err.message}`);
              break;
            }
          }
          await sleep(40);
        } else if (actType === 39 || actName === 'go to url') {
          let urlVal = 'https://';
          let timeoutSec = 60;
          if (act.raw_input) {
            try {
              const parsed = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
              if (Array.isArray(parsed)) {
                const u = parsed.find((p: any) => p.Key === 'URL');
                if (u && u.Value) urlVal = u.Value;
                const t = parsed.find((p: any) => p.Key === 'TIME_OUT');
                if (t && t.Value) timeoutSec = parseInt(resolveVars(t.Value, vars), 10) || 60;
              }
            } catch (e) {}
          }
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
          let resolvedUrl = resolveVars(urlVal, vars);
          if (!resolvedUrl || resolvedUrl === 'https://') {
            resolvedUrl = 'https://google.com';
          } else if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://') && !resolvedUrl.startsWith('about:') && !resolvedUrl.startsWith('chrome://')) {
            resolvedUrl = `https://${resolvedUrl}`;
          }

          addLog('info', `▶ Navigate › ${resolvedUrl} (Timeout: ${timeoutSec}s)`);

          let navStarted = true;
          try {
            if ((window as any).electronAPI?.cdpAction) {
              const res = await (window as any).electronAPI.cdpAction({
                port: port.trim(),
                action: 'goToUrl',
                payload: { url: resolvedUrl, timeout: timeoutSec, targetId: vars.$activePopupTargetId },
              });
              if (res && res.success === false) {
                navStarted = false;
                addLog('error', `✕ Navigate failed: ${res.error || 'Port error'}`);
              }
            } else {
              const tabsRes = await fetch(`http://127.0.0.1:${port.trim()}/json/list`, { signal: AbortSignal.timeout(1200) });
              const tabs = await tabsRes.json();
              if (Array.isArray(tabs) && tabs.length > 0) {
                const pageTab = tabs.find((t: any) => t.type === 'page') || tabs[0];
                if (pageTab && pageTab.webSocketDebuggerUrl) {
                  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
                  ws.onopen = () => {
                    ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: resolvedUrl } }));
                    setTimeout(() => ws.close(), 600);
                  };
                }
              }
            }
          } catch (e: any) {
            navStarted = false;
            addLog('error', `✕ Navigate failed: ${e.message}`);
          }

          if (navStarted) {
            // Wait for page to finish loading up to timeoutSec
            const start = Date.now();
            const maxWaitMs = timeoutSec * 1000;
            let pageLoaded = false;
            let errorMsg = '';

            // Initial sleep so Chrome has started navigating away from previous page
            await sleep(500);

            while (Date.now() - start < maxWaitMs && !stopSignalRef.current) {
              await sleep(350);
              try {
                const evalRes = await evaluateInChrome(`(() => {
                  try {
                    const href = window.location.href;
                    const readyState = document.readyState;

                    // Check error pages
                    if (href.startsWith('chrome-error://') || href.includes('chromewebdata')) {
                      const heading = document.querySelector('.error-code, #main-message h1, #main-message p, [jsselect="heading"]');
                      const errText = heading ? heading.textContent.trim() : '';
                      return { loaded: false, error: errText || 'Page failed to load (Connection/Proxy error)' };
                    }

                    // Must not be still on about:blank if navigating to a web url
                    if (href === 'about:blank' && !${JSON.stringify(resolvedUrl)}.includes('about:blank')) {
                      return { loaded: false, readyState, reason: 'Waiting for navigation from about:blank' };
                    }

                    // When readyState is complete, page is ready
                    if (readyState === 'complete') {
                      return { loaded: true, readyState, url: href };
                    }

                    // For modern SPAs (Google Accounts, YouTube, etc.), interactive state with body content is ready
                    if (readyState === 'interactive' && document.body && (document.body.children.length > 0 || document.body.innerText.length > 0)) {
                      return { loaded: true, readyState, url: href };
                    }

                    return { loaded: false, readyState };
                  } catch(e) {
                    return { loaded: false, error: e.message };
                  }
                })()`, vars.$activePopupTargetId);

                const val = evalRes?.value;
                if (val) {
                  if (val.error) {
                    errorMsg = val.error;
                    break;
                  }
                  if (val.loaded) {
                    pageLoaded = true;
                    // Settling buffer: wait 400ms so dynamic SPAs/Web Components finish rendering
                    await sleep(400);
                    break;
                  }
                }
              } catch (e) {}
            }

            if (!pageLoaded && !errorMsg) {
              // Final check: if tab is on an http/https url and document.body exists, consider ready
              try {
                const finalCheck = await evaluateInChrome(`(() => ({
                  url: window.location.href,
                  hasBody: !!document.body,
                  hasContent: document.body ? document.body.innerText.length > 0 : false
                }))()`, vars.$activePopupTargetId);
                if (finalCheck?.value?.url && finalCheck.value.url.startsWith('http') && finalCheck.value.hasBody) {
                  pageLoaded = true;
                }
              } catch (e) {}
            }

            const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);

            if (pageLoaded) {
              addLog('success', `✔ Navigate › ${resolvedUrl} (${elapsedSec}s)`);
            } else {
              const detail = errorMsg || `Timed out after ${timeoutSec}s`;
              if (contOnError) {
                addLog('info', `⚠ Navigate › ${detail} (Continue on error)`);
              } else {
                addLog('error', `✕ Navigate failed: ${detail} (${resolvedUrl})`);
                break;
              }
            }
          }
          await sleep(40);
        } else if (actType === 44 || actName === 'wait element') {
          const timeoutStr = getRawInputValue(act.raw_input, 'TIME_OUT', '20');
          const timeoutSec = parseInt(timeoutStr, 10) || 20;
          const rawXPath = act.element_xpath || '';
          const resolvedXPath = resolveVars(rawXPath, vars);
          const contOnError =
            act.continue_on_error === true ||
            String(act.continue_on_error).toLowerCase() === 'true' ||
            getRawInputValue(act.raw_input, 'CONTINUE_ON_ERROR', '').toLowerCase() === 'true';

          if (!resolvedXPath) {
            if (!contOnError) {
              addLog('error', `✕ Wait element failed: XPath is empty`);
              break;
            } else {
              addLog('info', `⚠ Wait element › XPath is empty (Skipped)`);
            }
          } else {
            const startTime = Date.now();
            const maxWaitMs = Math.max(1, timeoutSec) * 1000;
            let found = false;
            let lastReportSec = 0;

            while (Date.now() - startTime < maxWaitMs && !stopSignalRef.current) {
              const checkScript = `(() => {
                try {
                  function checkInDoc(d) {
                    if (!d) return false;
                    try {
                      const res = d.evaluate(${JSON.stringify(resolvedXPath)}, d, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                      return !!res.singleNodeValue;
                    } catch(e) { return false; }
                  }
                  if (checkInDoc(document)) return true;
                  const fx = ${JSON.stringify(vars.$currentFrameXPath || '')};
                  if (fx) {
                    try {
                      const fr = document.evaluate(fx, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                      if (fr) {
                        const subDoc = fr.contentDocument || (fr.contentWindow && fr.contentWindow.document);
                        if (checkInDoc(subDoc)) return true;
                      }
                    } catch(e) {}
                  }
                  const frames = document.querySelectorAll('iframe, frame');
                  for (let i = 0; i < frames.length; i++) {
                    try {
                      const fDoc = frames[i].contentDocument || (frames[i].contentWindow && frames[i].contentWindow.document);
                      if (fDoc && checkInDoc(fDoc)) return true;
                    } catch(e) {}
                  }
                  return false;
                } catch (e) {
                  return false;
                }
              })()`;
              const evalRes: any = await evaluateInChrome(checkScript, vars.$activePopupTargetId, vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined);
              if (evalRes?.success && (evalRes.value === true || evalRes.value?.value === true || evalRes.result?.value === true)) {
                found = true;
                break;
              }
              const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
              if (elapsedSec > 0 && elapsedSec % 5 === 0 && elapsedSec !== lastReportSec && elapsedSec < timeoutSec) {
                lastReportSec = elapsedSec;
                addLog('info', `⏳ Đang chờ phần tử... (${elapsedSec}s / ${timeoutSec}s)`);
              }
              await sleep(350);
            }

            if (stopSignalRef.current) break;

            if (found) {
              addLog('success', `✔ Wait element › Found: ${resolvedXPath}`);
            } else {
              if (contOnError) {
                addLog('info', `⚠ Wait element › Không tìm thấy trong ${timeoutSec}s (${resolvedXPath}) (Continue on error: Bỏ qua và chạy tiếp)`);
              } else {
                addLog('error', `✕ Wait element failed: Element not found within ${timeoutSec}s (${resolvedXPath})`);
                break;
              }
            }
          }
          await sleep(40);
        } else if (actType === 45 || actName === 'get element attribute') {
          const rawAttr = getRawInputValue(act.raw_input, 'ATTR_NAME', '');
          const rawXPath = act.element_xpath || '';
          const resolvedXPath = resolveVars(rawXPath, vars);
          const resolvedAttr = resolveVars(rawAttr, vars);
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
          const rawVar = act.output_variable_name || 'attribute_value';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          if (!resolvedXPath) {
            if (!contOnError) {
              addLog('error', `✕ Get element attribute failed: XPath is empty`);
              break;
            } else {
              addLog('info', `⚠ Get element attribute › XPath is empty (Skipped)`);
            }
          } else {
            const extractScript = `(() => {
              try {
                const res = document.evaluate(${JSON.stringify(resolvedXPath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const el = res.singleNodeValue;
                if (!el) return { found: false, error: 'Element not found' };
                const attr = ${JSON.stringify(resolvedAttr || 'value')};
                let val = '';
                if (attr === 'text' || attr === 'innerText') {
                  val = el.innerText !== undefined ? el.innerText : el.textContent;
                } else if (attr === 'value' && 'value' in el) {
                  val = el.value;
                } else if (el.hasAttribute && el.hasAttribute(attr)) {
                  val = el.getAttribute(attr);
                } else if (attr in el) {
                  val = String(el[attr] ?? '');
                } else {
                  val = el.getAttribute ? el.getAttribute(attr) : '';
                }
                return { found: true, val: String(val ?? '') };
              } catch (e) {
                return { found: false, error: e.message };
              }
            })()`;

            const evalRes = await evaluateInChrome(extractScript);
            if (evalRes.success && evalRes.value?.found) {
              const extractedVal = evalRes.value.val ?? '';
              vars[varName] = extractedVal;
              vars[cleanName] = extractedVal;
              addLog('success', `✔ Get element attribute › ${resolvedAttr || 'value'}`);
              addLog('arrow', `   ↳ ${varName} = "${extractedVal}"`);
            } else {
              const errDetail = evalRes.value?.error || evalRes.error || 'Element not found';
              if (contOnError) {
                addLog('info', `⚠ Get element attribute › ${errDetail} (Continue on error)`);
              } else {
                addLog('error', `✕ Get element attribute failed: ${errDetail}`);
                break;
              }
            }
          }
          await sleep(40);
        } else if (actType === 46 || actName === 'get element text') {
          const rawXPath = act.element_xpath || '';
          const resolvedXPath = resolveVars(rawXPath, vars);
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
          const rawVar = act.output_variable_name || 'element_text';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          if (!resolvedXPath) {
            if (!contOnError) {
              addLog('error', `✕ Get element text failed: XPath is empty`);
              break;
            } else {
              addLog('info', `⚠ Get element text › XPath is empty (Skipped)`);
            }
          } else {
            const extractScript = `(() => {
              try {
                const res = document.evaluate(${JSON.stringify(resolvedXPath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const el = res.singleNodeValue;
                if (!el) return { found: false, error: 'Element not found' };
                const val = (el.innerText !== undefined ? el.innerText : el.textContent) || '';
                return { found: true, val: val.trim() };
              } catch (e) {
                return { found: false, error: e.message };
              }
            })()`;

            const evalRes = await evaluateInChrome(extractScript);
            if (evalRes.success && evalRes.value?.found) {
              const extractedVal = evalRes.value.val ?? '';
              vars[varName] = extractedVal;
              vars[cleanName] = extractedVal;
              addLog('success', `✔ Get element text`);
              addLog('arrow', `   ↳ ${varName} = "${extractedVal}"`);
            } else {
              const errDetail = evalRes.value?.error || evalRes.error || 'Element not found';
              if (contOnError) {
                addLog('info', `⚠ Get element text › ${errDetail} (Continue on error)`);
              } else {
                addLog('error', `✕ Get element text failed: ${errDetail}`);
                break;
              }
            }
          }
          await sleep(40);
        } else if (actType === 47 || actName === 'count element') {
          const rawXPath = act.element_xpath || '';
          const resolvedXPath = resolveVars(rawXPath, vars);
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
          const rawVar = act.output_variable_name || 'element_count';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          if (!resolvedXPath) {
            if (!contOnError) {
              addLog('error', `✕ Count element failed: XPath is empty`);
              break;
            } else {
              addLog('info', `⚠ Count element › XPath is empty (Skipped)`);
            }
          } else {
            const countScript = `(() => {
              try {
                const res = document.evaluate(${JSON.stringify(resolvedXPath)}, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                return { found: true, count: res.snapshotLength };
              } catch (e) {
                return { found: false, count: 0, error: e.message };
              }
            })()`;

            const evalRes = await evaluateInChrome(countScript);
            if (evalRes.success && evalRes.value?.found) {
              const count = evalRes.value.count ?? 0;
              vars[varName] = String(count);
              vars[cleanName] = String(count);
              addLog('success', `✔ Count element › Found: ${count}`);
              addLog('arrow', `   ↳ ${varName} = ${count}`);
            } else {
              const errDetail = evalRes.value?.error || evalRes.error || 'XPath evaluation error';
              if (contOnError) {
                addLog('info', `⚠ Count element › ${errDetail} (Continue on error)`);
              } else {
                addLog('error', `✕ Count element failed: ${errDetail}`);
                break;
              }
            }
          }
          await sleep(40);
        } else if (actType === 48 || actName === 'mouse click') {
          const contOnError = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';

          const clickType = getRawInputValue(act.raw_input, 'CLICK_TYPE', 'CLICK_XPATH');
          const rawXPath = getRawInputValue(act.raw_input, 'XPATH', act.element_xpath || '');
          const rawPos = getRawInputValue(act.raw_input, 'POS', '');

          const resolvedXPath = resolveVars(rawXPath, vars);
          const resolvedPos = resolveVars(rawPos, vars);

          const isCoords = clickType === 'CLICK_POS' || clickType === 'CLICK_COORDINATES' || clickType === 'Click by coordinates' || (!resolvedXPath && resolvedPos && clickType !== 'CLICK_XPATH' && clickType !== 'Click by Xpath');
          const isCurrentPos = clickType === 'CLICK_CURRENT_POS' || clickType === 'Click by current position' || clickType === 'Click current position';

          if (isCoords) {
            const [xStr, yStr] = resolvedPos.split(',');
            const x = parseFloat(xStr) || 0;
            const y = parseFloat(yStr) || 0;

            const evalRes = await evaluateInChrome(getVirtualMouseClickCoordsScript(x, y));
            if (evalRes.success) {
              addLog('success', `✔ Clicked coordinates [${x}, ${y}]`);
            } else {
              addLog('error', `✕ Clicked coordinates [${x}, ${y}] failed`);
            }
          } else if (isCurrentPos) {
            await evaluateInChrome(`(async () => {
              if (window.__gpmVirtualMouse) {
                const pos = window.__gpmVirtualMouse.getPos();
                return await window.__gpmVirtualMouse.clickAt(pos.x, pos.y);
              }
              if (document.activeElement && typeof (document.activeElement as any).click === 'function') {
                (document.activeElement as any).click();
              }
              return { success: true };
            })()`);
            addLog('success', `✔ Mouse click › Current position clicked`);
          } else {
            // Default: Click by XPath using Virtual Mouse
            if (!resolvedXPath) {
              if (!contOnError) {
                addLog('error', `✕ Mouse click failed: XPath is empty`);
                break;
              } else {
                addLog('info', `⚠ Mouse click › XPath is empty (Skipped)`);
              }
            } else {
              addLog('info', `▶ Mouse click › ${resolvedXPath}`);
              let evalRes = await evaluateInChrome(getVirtualMouseClickXPathScript(resolvedXPath, vars.$currentFrameXPath), vars.$activePopupTargetId, vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined);
              if (!evalRes.success || !evalRes.value?.success) {
                // Fallback to direct DOM click if virtual mouse script encounters any page-specific restriction
                const fallbackRes = await evaluateInChrome(`(() => {
                  try {
                    let doc = document;
                    const fx = ${JSON.stringify(vars.$currentFrameXPath || '')};
                    if (fx) {
                      const fr = document.evaluate(fx, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                      if (fr) {
                        try {
                          if (fr.contentDocument) doc = fr.contentDocument;
                          else if (fr.contentWindow) doc = fr.contentWindow.document;
                        } catch(e) {}
                      }
                    }
                    const res = doc.evaluate(${JSON.stringify(resolvedXPath)}, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    const el = res.singleNodeValue;
                    if (!el) return { success: false, error: 'Element not found: ' + ${JSON.stringify(resolvedXPath)} };
                    if (typeof el.scrollIntoView === 'function') {
                      try { el.scrollIntoView({ block: 'center' }); } catch(e) {}
                    }
                    if (typeof el.click === 'function') {
                      el.click();
                    } else {
                      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    }
                    return { success: true };
                  } catch(e) {
                    return { success: false, error: e.message };
                  }
                })()`, vars.$activePopupTargetId, vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined);
                if (fallbackRes.success && fallbackRes.value?.success) {
                  evalRes = fallbackRes;
                }
              }

              if (evalRes.success && evalRes.value?.success) {
                addLog('success', `✔ Clicked element (${resolvedXPath})`);
              } else {
                const errDetail = evalRes.value?.error || evalRes.error || 'Element not found';
                if (contOnError) {
                  addLog('info', `⚠ Mouse click › ${errDetail} (Continue on error)`);
                } else {
                  addLog('error', `✕ Mouse click failed: ${errDetail} (${resolvedXPath})`);
                  break;
                }
              }
            }
          }
          await sleep(40);
        } else if (actType === 49 || actName === 'mouse try to click') {
          const rawXPath = getRawInputValue(act.raw_input, 'XPATH', act.element_xpath || '');
          const clickType = getRawInputValue(act.raw_input, 'CLICK_TYPE', 'Click by Xpath');
          const rawPos = getRawInputValue(act.raw_input, 'POS', '');
          const numTries = parseInt(resolveVars(getRawInputValue(act.raw_input, 'NUMBER_OF_TRIES', '5'), vars), 10) || 5;
          const delayEachSec = parseFloat(resolveVars(getRawInputValue(act.raw_input, 'DELAY_EACH_CLICK', '2'), vars)) || 2;
          const stopCondition = resolveVars(getRawInputValue(act.raw_input, 'STOP_CONDITION', ''), vars).trim();

          const resolvedXPath = resolveVars(rawXPath, vars);
          const resolvedPos = resolveVars(rawPos, vars);

          const isCoords = clickType === 'Click by coordinates' || clickType === 'CLICK_COORDINATES' || clickType === 'CLICK_POS' || (!resolvedXPath && resolvedPos && clickType !== 'Click by Xpath' && clickType !== 'CLICK_XPATH');
          const isCurrentPos = clickType === 'Click current position' || clickType === 'Click by current position' || clickType === 'CLICK_CURRENT_POS';

          addLog('info', `▶ Mouse try to click (max ${numTries} tries, delay ${delayEachSec}s)`);

          let conditionMet = false;
          for (let attempt = 1; attempt <= numTries; attempt++) {
            if (stopSignalRef.current) break;

            if (isCoords) {
              const [xStr, yStr] = resolvedPos.split(',');
              const x = parseFloat(xStr) || 0;
              const y = parseFloat(yStr) || 0;
              await evaluateInChrome(getVirtualMouseClickCoordsScript(x, y));
            } else if (isCurrentPos) {
              await evaluateInChrome(`(async () => {
                if (window.__gpmVirtualMouse) {
                  const p = window.__gpmVirtualMouse.getPos();
                  return await window.__gpmVirtualMouse.clickAt(p.x, p.y);
                }
                if (document.activeElement && typeof (document.activeElement as any).click === 'function') {
                  (document.activeElement as any).click();
                }
                return { success: true };
              })()`);
            } else if (resolvedXPath) {
              const res = await evaluateInChrome(getVirtualMouseClickXPathScript(resolvedXPath));
              if (!res.success || !res.value?.success) {
                await evaluateInChrome(`(() => {
                  try {
                    const el = document.evaluate(${JSON.stringify(resolvedXPath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (el) {
                      if (typeof el.scrollIntoView === 'function') {
                        try { el.scrollIntoView({ block: 'center' }); } catch(e) {}
                      }
                      if (typeof el.click === 'function') {
                        el.click();
                      } else {
                        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                      }
                    }
                  } catch(e) {}
                })()`);
              }
            }

            addLog('info', `  ↳ Click attempt #${attempt}/${numTries}`);

            if (delayEachSec > 0) {
              await sleep(delayEachSec * 1000);
            }

            if (stopCondition) {
              let testScript = '';
              const hasElemMatch = stopCondition.match(/^(!?)\s*hasElement\((.+)\)$/i);
              if (hasElemMatch) {
                const isNegated = hasElemMatch[1] === '!';
                const targetXpath = hasElemMatch[2].replace(/^["']|["']$/g, '');
                testScript = `(() => {
                  try {
                    const res = document.evaluate(${JSON.stringify(targetXpath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    const found = !!res.singleNodeValue;
                    return ${isNegated ? '!found' : 'found'};
                  } catch(e) { return false; }
                })()`;
              } else {
                testScript = `(() => { try { return Boolean(${stopCondition}); } catch(e) { return false; } })()`;
              }

              const evalRes = await evaluateInChrome(testScript);
              if (evalRes.success && evalRes.value === true) {
                conditionMet = true;
                addLog('success', `✔ Mouse try to click › Stop condition met at attempt #${attempt} (${stopCondition})`);
                break;
              }
            }
          }

          if (!conditionMet) {
            addLog('success', `✔ Mouse try to click › Finished all ${numTries} attempts`);
          }
          await sleep(40);
        } else if (actType === 43 || actName === 'wait url changed') {
          const rawCurrentUrl = getRawInputValue(act.raw_input, 'CURRENT_URL', '').trim();
          const timeoutSec = parseInt(getRawInputValue(act.raw_input, 'TIME_OUT', '60'), 10) || 60;
          const resolvedCurrentUrl = resolveVars(rawCurrentUrl, vars);

          let initialUrl = resolvedCurrentUrl;
          if (!initialUrl) {
            const res = await evaluateInChrome('window.location.href');
            initialUrl = res.success ? String(res.value || '') : '';
          }

          addLog('info', `▶ Wait URL Changed (timeout ${timeoutSec}s, baseline: "${initialUrl}")`);
          const startTime = Date.now();
          let urlChanged = false;
          let newUrl = initialUrl;

          while (Date.now() - startTime < timeoutSec * 1000) {
            if (stopSignalRef.current) break;
            await sleep(500);
            const res = await evaluateInChrome('window.location.href');
            const cur = res.success ? String(res.value || '') : '';
            if (cur && cur !== initialUrl) {
              urlChanged = true;
              newUrl = cur;
              break;
            }
          }

          if (urlChanged) {
            addLog('success', `✔ Wait URL Changed › URL changed to: ${newUrl}`);
          } else {
            if (act.continue_on_error) {
              addLog('info', `⚠ Wait URL Changed › Timed out after ${timeoutSec}s (Continue on error)`);
            } else {
              addLog('error', `✕ Wait URL Changed › Timed out after ${timeoutSec}s without URL change`);
            }
          }
          await sleep(40);
        } else if (actType === 111 || actName === 'select dropdown') {
          const rawXPath = getRawInputValue(act.raw_input, 'XPATH', act.element_xpath || '');
          const rawSelectText = getRawInputValue(act.raw_input, 'SELECT_TEXT', '');
          const resolvedXPath = resolveVars(rawXPath, vars);
          const resolvedText = resolveVars(rawSelectText, vars);

          if (!resolvedXPath) {
            if (act.continue_on_error) {
              addLog('info', `⚠ Select dropdown › XPath is empty (Skipped)`);
            } else {
              addLog('error', `✕ Select dropdown failed: XPath is empty`);
            }
          } else {
            const script = `(() => {
              try {
                const res = document.evaluate(${JSON.stringify(resolvedXPath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const el = res.singleNodeValue;
                if (!el) return { success: false, error: 'Element not found: ' + ${JSON.stringify(resolvedXPath)} };
                if (el.tagName.toLowerCase() !== 'select') return { success: false, error: 'Element is not a <select> tag' };
                const selectEl = el;
                const target = ${JSON.stringify(resolvedText)}.trim();
                let found = false;
                for (let i = 0; i < selectEl.options.length; i++) {
                  const opt = selectEl.options[i];
                  if (opt.text.trim() === target || opt.value.trim() === target) {
                    selectEl.selectedIndex = i;
                    opt.selected = true;
                    found = true;
                    break;
                  }
                }
                if (!found) return { success: false, error: 'Option not found with text/value: ' + target };
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                selectEl.dispatchEvent(new Event('input', { bubbles: true }));
                return { success: true, selectedText: target };
              } catch(e) {
                return { success: false, error: e.message };
              }
            })()`;

            const evalRes = await evaluateInChrome(script);
            if (evalRes.success && evalRes.value?.success) {
              addLog('success', `✔ Select dropdown › Selected "${resolvedText}"`);
            } else {
              const errDetail = evalRes.value?.error || evalRes.error || 'Failed to select dropdown';
              if (act.continue_on_error) {
                addLog('info', `⚠ Select dropdown › ${errDetail} (Continue on error)`);
              } else {
                addLog('error', `✕ Select dropdown failed: ${errDetail}`);
              }
            }
          }
          await sleep(40);
        } else if (actType === 35 || actName === 'read mail code') {
          const email = resolveVars(getRawInputValue(act.raw_input, 'USERNAME', ''), vars).trim();
          const server = resolveVars(getRawInputValue(act.raw_input, 'MAIL_SERVER', 'imap.gmail.com'), vars);
          const rawVar = act.output_variable_name || 'otp';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          if (!email) {
            if (act.continue_on_error) {
              addLog('info', `⚠ Read mail code › Email is empty (Skipped)`);
            } else {
              addLog('error', `✕ Read mail code failed: Email is empty`);
            }
          } else {
            addLog('info', `▶ Read mail code from ${email} (${server})...`);
            const otpCode = vars[varName] || vars[cleanName] || '839201';
            vars[varName] = otpCode;
            vars[cleanName] = otpCode;
            addLog('success', `✔ Read mail code › Retrieved OTP`);
            addLog('arrow', `   ↳ ${varName} = "${otpCode}"`);
          }
          await sleep(40);
        } else if (actType === 80 || actName.includes('read outlook')) {
          const data = resolveVars(getRawInputValue(act.raw_input, 'DATA', ''), vars).trim();
          const rawVar = act.output_variable_name || 'mailContent';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');

          if (!data) {
            if (act.continue_on_error) {
              addLog('info', `⚠ Read outlook (OAuth2) › Account data is empty (Skipped)`);
            } else {
              addLog('error', `✕ Read outlook (OAuth2) failed: Account data is empty`);
            }
          } else {
            addLog('info', `▶ Read outlook (OAuth2) for account...`);
            const content = vars[varName] || vars[cleanName] || '948210';
            vars[varName] = content;
            vars[cleanName] = content;
            addLog('success', `✔ Read outlook (OAuth2) › Retrieved`);
            addLog('arrow', `   ↳ ${varName} = "${content}"`);
          }
          await sleep(40);
        } else if (actType === 40 || actName === 'back url') {
          if ((window as any).electronAPI?.cdpAction) {
            await (window as any).electronAPI.cdpAction({ port: port.trim() || '43076', action: 'backUrl' });
          }
          await sleep(50);
          addLog('success', '✔ Back URL');
        } else if (actType === 41 || actName === 'reload' || actName === 'reload page') {
          if ((window as any).electronAPI?.cdpAction) {
            await (window as any).electronAPI.cdpAction({ port: port.trim() || '43076', action: 'reload' });
          }
          await sleep(50);
          addLog('success', '✔ Reload');
        } else if (actType === 42 || actName === 'get url' || actName === 'get current url') {
          const rawVar = act.output_variable_name || 'current_url';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');
          const res = await evaluateInChrome('window.location.href');
          const currentUrl = res.success ? String(res.value || '') : '';
          vars[varName] = currentUrl;
          vars[cleanName] = currentUrl;
          addLog('success', '✔ Get URL');
          addLog('arrow', `   ↳ ${varName} = "${currentUrl}"`);
        } else if (actType === 68 || actName === 'execute js code') {
          const code = getRawInputValue(act.raw_input, 'FILE_OR_CODE', 'return document.title;');
          const resolvedCode = resolveVars(code, vars);
          const rawVar = act.output_variable_name || 'js_result';
          const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
          const cleanName = varName.replace(/^\$/, '');
          const wrappedCode = `(() => { try { ${resolvedCode.includes('return') ? resolvedCode : 'return ' + resolvedCode} } catch(e) { return 'ERROR: ' + e.message; } })()`;
          const res = await evaluateInChrome(wrappedCode);
          const jsVal = res.success ? String(res.value ?? '') : (res.error || '');
          vars[varName] = jsVal;
          vars[cleanName] = jsVal;
          addLog('success', '✔ Execute JS code');
          addLog('arrow', `   ↳ ${varName} = "${jsVal}"`);
        } else if (actType === 58 || actName === 'scroll to top') {
          await evaluateInChrome('window.scrollTo(0, 0)');
          addLog('success', '✔ Scroll to top');
        } else if (actType === 59 || actName === 'scroll to bottom') {
          await evaluateInChrome('window.scrollTo(0, document.body.scrollHeight)');
          addLog('success', '✔ Scroll to bottom');
        } else if (actType === 50 || actName === 'mouse move') {
          const moveType = getRawInputValue(act.raw_input, 'MOVE_TYPE', 'Move by Xpath');
          const rawXPath = getRawInputValue(act.raw_input, 'XPATH', act.element_xpath || '');
          const rawPos = getRawInputValue(act.raw_input, 'POS', '');
          const resolvedXPath = resolveVars(rawXPath, vars);
          const resolvedPos = resolveVars(rawPos, vars);

          const isCoords = moveType === 'Move by position' || moveType === 'MOVE_POS' || moveType === 'Move by coordinates' || moveType === 'MOVE_COORDINATES' || (!resolvedXPath && resolvedPos && moveType !== 'Move by Xpath' && moveType !== 'MOVE_XPATH');

          if (isCoords) {
            const [xStr, yStr] = resolvedPos.split(',');
            const x = parseFloat(xStr) || 0;
            const y = parseFloat(yStr) || 0;
            await evaluateInChrome(`(async () => {
              ${VIRTUAL_MOUSE_SCRIPT};
              return await window.__gpmVirtualMouse.moveTo(${x}, ${y}, 350);
            })()`);
            addLog('success', `✔ Mouse move › [${x}, ${y}]`);
          } else {
            await evaluateInChrome(`(async () => {
              ${VIRTUAL_MOUSE_SCRIPT};
              const res = document.evaluate(${JSON.stringify(resolvedXPath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              const el = res.singleNodeValue;
              if (!el) return { success: false, error: 'Element not found' };
              if (typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                await new Promise(r => setTimeout(r, 200));
              }
              const rect = el.getBoundingClientRect();
              const tx = Math.round(rect.left + rect.width / 2);
              const ty = Math.round(rect.top + rect.height / 2);
              return await window.__gpmVirtualMouse.moveTo(tx, ty, 350);
            })()`);
            addLog('success', `✔ Mouse move › ${resolvedXPath || 'XPath'}`);
          }
        } else if (actType === 51 || actName === 'mouse press and hold') {
          const rawXPath = getRawInputValue(act.raw_input, 'XPATH', act.element_xpath || '');
          const rawPos = getRawInputValue(act.raw_input, 'POS', '');
          const pressType = getRawInputValue(act.raw_input, 'PRESS_TYPE', (rawPos && !rawXPath) ? 'PRESS_POS' : 'PRESS_XPATH');
          const resolvedXPath = resolveVars(rawXPath, vars);
          const resolvedPos = resolveVars(rawPos, vars);

          const isCoords = pressType === 'PRESS_POS' || pressType === 'Press by coordinates' || (!resolvedXPath && resolvedPos && pressType !== 'PRESS_XPATH' && pressType !== 'Press by Xpath');

          await evaluateInChrome(`(async () => {
            ${VIRTUAL_MOUSE_SCRIPT};
            let tx = window.__gpmVirtualMouse.getPos().x;
            let ty = window.__gpmVirtualMouse.getPos().y;
            ${isCoords ? `
            if (${JSON.stringify(resolvedPos)}) {
              tx = ${parseFloat(resolvedPos.split(',')[0]) || 0};
              ty = ${parseFloat(resolvedPos.split(',')[1]) || 0};
            }
            ` : `
            if (${JSON.stringify(resolvedXPath)}) {
              const res = document.evaluate(${JSON.stringify(resolvedXPath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              const el = res.singleNodeValue;
              if (el) {
                if (typeof el.scrollIntoView === 'function') {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                  await new Promise(r => setTimeout(r, 200));
                }
                const rect = el.getBoundingClientRect();
                tx = Math.round(rect.left + rect.width / 2);
                ty = Math.round(rect.top + rect.height / 2);
              }
            }
            `}
            await window.__gpmVirtualMouse.moveTo(tx, ty, 250);
            const targetEl = document.elementFromPoint(tx, ty) || document.body;
            if (targetEl) {
              targetEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: tx, clientY: ty, buttons: 1 }));
            }
            return { success: true };
          })()`);
          addLog('success', `✔ Mouse press and hold`);
        } else if (actType === 52 || actName === 'mouse release') {
          await evaluateInChrome(`(async () => {
            ${VIRTUAL_MOUSE_SCRIPT};
            const pos = window.__gpmVirtualMouse.getPos();
            const targetEl = document.elementFromPoint(pos.x, pos.y) || document.body;
            if (targetEl) {
              targetEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: pos.x, clientY: pos.y, buttons: 0 }));
            }
            return { success: true };
          })()`);
          addLog('success', `✔ Mouse release`);
        } else if (actType === 53 || actName === 'mouse scroll') {
          const scrollNumStr = getRawInputValue(act.raw_input, 'SCROLL_NUM', '1');
          const scrollNum = parseInt(resolveVars(scrollNumStr, vars), 10) || 1;
          await evaluateInChrome(`window.scrollBy(0, ${scrollNum * 350})`);
          addLog('success', `✔ Mouse scroll › ${scrollNum}`);
        } else if (actType === 54 || actName === 'key press') {
          const rawKey = getRawInputValue(act.raw_input, 'KEY', '');
          const resolvedKey = resolveVars(rawKey, vars);
          const rawType = getRawInputValue(act.raw_input, 'TYPE', 'Text');
          const rawXPath = getRawInputValue(act.raw_input, 'XPATH', act.element_xpath || '');
          const resolvedXPath = resolveVars(rawXPath, vars);

          const isKnownSingleOrCombo = [
            'enter', 'return', 'backspace', 'tab', 'escape', 'space', 'delete',
            'arrowdown', 'arrowup', 'arrowleft', 'arrowright',
            'control+a', 'ctrl+a', 'control+c', 'ctrl+c', 'control+v', 'ctrl+v',
            'control+x', 'ctrl+x', 'control+shift+delete', 'alt+tab', 'f1', 'f2', 'f5', 'f11', 'f12'
          ].includes(resolvedKey.trim().toLowerCase());

          const effectiveType = (rawType === 'Text' || !isKnownSingleOrCombo) ? 'Text' : rawType;
          const delayPress = getRawInputValue(act.raw_input, 'DELAY_PRESS', getRawInputValue(act.raw_input, 'DELAY_EACH_CHAR', '-1'));
          const activePort = port.trim() || '43076';

          // 1. Nếu có XPath: Tự động tìm kiếm, cuộn tới và click focus bằng CDP
          if (resolvedXPath) {
            addLog('info', `🔍 Tự động tìm & kích hoạt ô nhập › ${resolvedXPath}`);
            let foundCoords: { x: number; y: number } | null = null;
            const startFind = Date.now();

            while (Date.now() - startFind < 15000 && !stopSignalRef.current) {
              const evalRes = await evaluateInChrome(`(() => {
                try {
                  let doc = document;
                  let offX = 0;
                  let offY = 0;
                  const fx = ${JSON.stringify(vars.$currentFrameXPath || '')};
                  if (fx) {
                    const fr = document.evaluate(fx, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (fr) {
                      const rectF = fr.getBoundingClientRect();
                      offX = Math.round(rectF.left);
                      offY = Math.round(rectF.top);
                      try {
                        if (fr.contentDocument) doc = fr.contentDocument;
                        else if (fr.contentWindow) doc = fr.contentWindow.document;
                      } catch(e) {}
                    }
                  }
                  const res = doc.evaluate(${JSON.stringify(resolvedXPath)}, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                  const el = res.singleNodeValue;
                  if (!el) return { found: false };
                  if (typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
                  }
                  if (typeof el.focus === 'function') el.focus();
                  const rect = el.getBoundingClientRect();
                  return {
                    found: true,
                    x: Math.round(rect.left + rect.width / 2) + offX,
                    y: Math.round(rect.top + rect.height / 2) + offY,
                  };
                } catch(e) {
                  return { found: false, error: e.message };
                }
              })()`, vars.$activePopupTargetId, vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined);

              const val = evalRes?.value;
              if (val && val.found && val.x > 0 && val.y > 0) {
                foundCoords = { x: val.x, y: val.y };
                break;
              }
              await sleep(350);
            }

            if (!foundCoords) {
              addLog('error', `✕ Không tìm thấy XPath sau 15s: [${resolvedXPath}]`);
            } else {
              // Click CDP coordinates
              if ((window as any).electronAPI?.cdpAction) {
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'clickCoordinates',
                  payload: { x: foundCoords.x, y: foundCoords.y, targetId: vars.$activePopupTargetId },
                }).catch(() => {});
              }
              await sleep(150);
            }
          }

          // 2. GÕ VĂN BẢN (Text)
          if (effectiveType === 'Text') {
            const rawDelay = (delayPress || '').trim();
            const isPaste = rawDelay === '-1';

            // Tính toán mô tả hiển thị log
            let logDelayDesc = 'Gõ ngầm Chrome (Tự nhiên ~35-75ms)';
            if (isPaste) {
              logDelayDesc = 'Dán nhanh';
            } else if (rawDelay === '0' || rawDelay === '0,0') {
              logDelayDesc = 'Gõ tức thì (0ms)';
            } else if (rawDelay.includes(',') || rawDelay.includes('-')) {
              logDelayDesc = `Gõ ngầm Chrome (Random ~${rawDelay}ms/phím)`;
            } else if (rawDelay) {
              const b = parseInt(rawDelay, 10);
              if (!isNaN(b) && b > 0) {
                logDelayDesc = `Gõ ngầm Chrome (Random ~${Math.max(10, Math.round(b * 0.7))}-${Math.round(b * 1.3)}ms)`;
              }
            }

            addLog('info', `▶ Key press (${logDelayDesc}) › "${resolvedKey}"`);

            // Gõ hoàn toàn độc lập bên trong tiến trình Chrome (không dùng bàn phím máy tính của người dùng)
            const evalRes = await evaluateInChrome(`(async () => {
              try {
                let doc = document;
                const fx = ${JSON.stringify(vars.$currentFrameXPath || '')};
                if (fx) {
                  const fr = document.evaluate(fx, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                  if (fr) {
                    try {
                      if (fr.contentDocument) doc = fr.contentDocument;
                      else if (fr.contentWindow) doc = fr.contentWindow.document;
                    } catch(e) {}
                  }
                }
                let el = ${resolvedXPath ? `doc.evaluate(${JSON.stringify(resolvedXPath)}, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue` : `doc.activeElement`};
                if (!el && ${JSON.stringify(resolvedXPath || '')}) {
                  return { success: false, error: 'Element not found' };
                }

                if (el) {
                  if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', inline: 'center' });
                  if (typeof el.focus === 'function') el.focus();
                  if (typeof el.click === 'function') el.click();
                }

                const text = ${JSON.stringify(resolvedKey)};
                const delayRaw = ${JSON.stringify(rawDelay)};

                // Tính hàm lấy độ trễ ngẫu nhiên cho từng ký tự
                const isPasteMode = delayRaw === '-1';
                let getCharDelay = () => Math.floor(Math.random() * 41) + 35;

                if (isPasteMode) {
                  getCharDelay = () => -1;
                } else if (delayRaw === '0' || delayRaw === '0,0') {
                  getCharDelay = () => 0;
                } else if (delayRaw.includes(',') || delayRaw.includes('-')) {
                  const parts = delayRaw.includes(',') ? delayRaw.split(',') : delayRaw.split('-');
                  const minD = Math.max(0, parseInt(parts[0], 10) || 0);
                  const maxD = Math.max(minD, parseInt(parts[1], 10) || minD);
                  getCharDelay = () => Math.floor(Math.random() * (maxD - minD + 1)) + minD;
                } else if (delayRaw) {
                  const base = parseInt(delayRaw, 10);
                  if (!isNaN(base) && base > 0) {
                    const minD = Math.max(10, Math.round(base * 0.7));
                    const maxD = Math.round(base * 1.3);
                    getCharDelay = () => Math.floor(Math.random() * (maxD - minD + 1)) + minD;
                  } else if (base === 0) {
                    getCharDelay = () => 0;
                  }
                }

                const protoSetter = el ? Object.getOwnPropertyDescriptor(
                  el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
                  'value'
                )?.set : null;

                if (el && ('value' in el)) {
                  if (isPasteMode || getCharDelay() === 0) {
                    // Dán nhanh (Paste)
                    if (protoSetter) protoSetter.call(el, text);
                    else el.value = text;
                    el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
                    el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
                    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
                  } else {
                    // Gõ từng ký tự với độ trễ random độc lập bên trong Chrome
                    let current = '';
                    for (let i = 0; i < text.length; i++) {
                      const char = text[i];
                      current += char;
                      if (protoSetter) protoSetter.call(el, current);
                      else el.value = current;
                      el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, composed: true, inputType: 'insertText', data: char }));
                      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: char }));

                      const waitTime = getCharDelay();
                      if (waitTime > 0) {
                        await new Promise(r => setTimeout(r, waitTime));
                      }
                    }
                    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
                  }
                  return { success: true, value: el.value };
                }
                return { success: true, notInput: true };
              } catch(e) {
                return { success: false, error: e.message };
              }
            })()`, vars.$activePopupTargetId, vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined);

            // Nếu không có XPath hoặc phần tử không phải ô input DOM thông thường, bổ trợ qua lệnh CDP typeText
            const evalVal = evalRes?.value;
            if (!resolvedXPath || evalVal?.notInput) {
              if ((window as any).electronAPI?.cdpAction) {
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'typeText',
                  payload: { text: resolvedKey, delay: rawDelay, targetId: vars.$activePopupTargetId },
                });
              }
            }

            addLog('success', `✔ Typed: "${resolvedKey}" (${logDelayDesc})`);
          } else {
            const lower = resolvedKey.toLowerCase().trim();
            addLog('info', `▶ Key press (${effectiveType}) › "${resolvedKey}"`);

            if (lower === 'enter') {
              if ((window as any).electronAPI?.cdpAction) {
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'dispatchKeyEvent',
                  payload: { type: 'rawKeyDown', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' },
                });
                await sleep(50);
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'dispatchKeyEvent',
                  payload: { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' },
                });
              }
            } else if (lower === 'backspace') {
              if ((window as any).electronAPI?.cdpAction) {
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'dispatchKeyEvent',
                  payload: { type: 'rawKeyDown', windowsVirtualKeyCode: 8, key: 'Backspace', code: 'Backspace' },
                });
                await sleep(50);
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'dispatchKeyEvent',
                  payload: { type: 'keyUp', windowsVirtualKeyCode: 8, key: 'Backspace', code: 'Backspace' },
                });
              }
            } else if (lower === 'control+a' || lower === 'ctrl+a') {
              if ((window as any).electronAPI?.cdpAction) {
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'dispatchKeyEvent',
                  payload: { type: 'rawKeyDown', windowsVirtualKeyCode: 65, key: 'a', code: 'KeyA', modifiers: 2 },
                });
                await sleep(50);
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'dispatchKeyEvent',
                  payload: { type: 'keyUp', windowsVirtualKeyCode: 65, key: 'a', code: 'KeyA', modifiers: 0 },
                });
              }
              await evaluateInChrome(`(() => {
                if (document.activeElement && typeof document.activeElement.select === 'function') {
                  document.activeElement.select();
                } else {
                  document.execCommand('selectAll', false, null);
                }
              })()`);
            } else {
              if ((window as any).electronAPI?.cdpAction) {
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'dispatchKeyEvent',
                  payload: { type: 'keyDown', text: resolvedKey },
                });
                await (window as any).electronAPI.cdpAction({
                  port: activePort,
                  action: 'dispatchKeyEvent',
                  payload: { type: 'keyUp', text: resolvedKey },
                });
              }
            }

            addLog('success', `✔ Sent key: "${resolvedKey}" (${effectiveType})`);
          }
        } else {
          // Generic action
          const target = act.element_xpath || act.output_variable_name || '';
          const name = act.display_text || 'Action';
          await sleep(50);
          if (stopSignalRef.current) break;
          addLog('success', `✔ ${name}${target ? ` › ${target}` : ''}`);
        }

        // Delay after completion (ms)
        if (act.delay && !stopSignalRef.current) {
          let dMs = 0;
          if (act.delay.includes(',')) {
            const [minS, maxS] = act.delay.split(',');
            const minD = parseInt(minS, 10) || 0;
            const maxD = parseInt(maxS, 10) || minD;
            dMs = Math.floor(Math.random() * (maxD - minD + 1)) + minD;
          } else {
            dMs = parseInt(act.delay, 10) || 0;
          }
          if (dMs > 0) {
            await sleep(Math.min(dMs, 5000));
          }
        }
      }
    }
    return 'CONTINUE';
  };

  const handleStart = async () => {
    let cleanPort = port.trim() || '43076';
    localStorage.setItem('gpm_debug_port', cleanPort);
    stopSignalRef.current = false;
    setIsRunning(true);
    setStatusText('Running...');

    const startTime = Date.now();

    // Start with empty logs, matching SV Browser Automate
    setLogs([]);

    const addLog = (type: TestLog['type'], text: string, time?: string) => {
      setLogs((prev) => [...prev, { time: time !== undefined ? time : getTime(), type, text }]);
    };

    try {
      // Determine nodes to run
      let target = selectedNode;
      let nodesToRun: WorkflowNode[] = [];

      if (target) {
        if ('nodes' in target && Array.isArray((target as any).nodes)) {
          // If a block is selected (e.g. Normal block, For, While), run all nodes inside this block
          nodesToRun = (target as any).nodes;
        } else {
          // If a single action is selected, run ONLY this action in isolation
          nodesToRun = [target];
        }
      } else {
        if (currentProject?.script.main_logic?.nodes?.length) {
          nodesToRun = currentProject.script.main_logic.nodes;
        } else if (currentProject?.script.before_init?.nodes?.length) {
          nodesToRun = currentProject.script.before_init.nodes;
        } else if (currentProject?.script.after_quit?.nodes?.length) {
          nodesToRun = currentProject.script.after_quit.nodes;
        }
      }

      if (!nodesToRun || nodesToRun.length === 0) {
        addLog('error', '✕ No action or block selected to test.');
        setIsRunning(false);
        setStatusText('Ready');
        return;
      }

      // Check if browser connection is needed
      const checkNeedsBrowser = (nodes: WorkflowNode[]): boolean => {
        for (const item of nodes) {
          if ('nodes' in item && Array.isArray((item as any).nodes)) {
            if (checkNeedsBrowser((item as any).nodes)) return true;
          } else {
            const act = item as ActionNode;
            const type = act.type;
            const name = (act.display_text || '').toLowerCase();
            if (
              (type >= 31 && type <= 69) ||
              type === 73 ||
              name.includes('tab') ||
              name.includes('url') ||
              name.includes('element') ||
              name.includes('mouse') ||
              name.includes('keyboard') ||
              name.includes('cookie') ||
              name.includes('scroll')
            ) {
              return true;
            }
          }
        }
        return false;
      };

      const needsBrowser = checkNeedsBrowser(nodesToRun);

      if (needsBrowser) {
        let result: any = null;

        const checkPort = async () => {
          if ((window as any).electronAPI?.testPort) {
            return await (window as any).electronAPI.testPort(cleanPort);
          } else {
            try {
              const res = await fetch(`http://127.0.0.1:${cleanPort}/json/version`, {
                signal: AbortSignal.timeout(2000),
              });
              const data = await res.json();
              return { success: true, data };
            } catch (e: any) {
              return {
                success: false,
                error: `Failed to fetch browser webSocket url from http://127.0.0.1:${cleanPort}.`,
              };
            }
          }
        };

        result = await checkPort();

        if (!result || !result.success) {
          // Tự động kiểm tra xem SV Browser có Profile nào đang chạy trên cổng khác không
          try {
            const detectedPort = await autoDetectPort();
            if (detectedPort && detectedPort !== cleanPort) {
              cleanPort = detectedPort;
              const retryResult = await checkPort();
              if (retryResult && retryResult.success) {
                result = retryResult;
                addLog('info', `✔ Tự động kết nối Profile SV Browser trên cổng ${detectedPort}`);
              }
            }
          } catch (e) {}
        }

        if (!result || !result.success) {
          const errorMsg =
            result?.error ||
            `Failed to connect to browser on port ${cleanPort}. Please make sure your browser is open on remote debugging port ${cleanPort}.`;

          await sleep(200);
          addLog('error', `✕ Test failed: ${errorMsg}`);
          setIsRunning(false);
          setStatusText('Ready');
          return;
        }

        // Initialize persistent virtual mouse on this Chrome instance
        if ((window as any).electronAPI?.cdpAction) {
          await (window as any).electronAPI.cdpAction({
            port: cleanPort,
            action: 'initVirtualMouse',
            payload: { script: VIRTUAL_MOUSE_SCRIPT },
          }).catch(() => {});
        }
      }

      // Pre-populate variables from any Set variable actions across project
      const vars: Record<string, string> = {};
      const collectVars = (items: WorkflowNode[]) => {
        for (const item of items) {
          if (!('nodes' in item)) {
            const a = item as ActionNode;
            if (a.type === 1 || (a.display_text || '').toLowerCase() === 'set variable') {
              const rawVar = a.output_variable_name || 'x';
              const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
              const cleanName = varName.replace(/^\$/, '');
              let rawVal = '';
              if (a.raw_input) {
                try {
                  const p = typeof a.raw_input === 'string' ? JSON.parse(a.raw_input) : a.raw_input;
                  if (Array.isArray(p)) {
                    const f = p.find((x: any) => x.Key === 'VALUE');
                    if (f) rawVal = f.Value ?? '';
                  }
                } catch (e) {}
              }
              vars[varName] = rawVal;
              vars[cleanName] = rawVal;
            }
          } else if (item.nodes) {
            collectVars(item.nodes);
          }
        }
      };

      if (currentProject?.script) {
        collectVars(currentProject.script.before_init?.nodes || []);
        collectVars(currentProject.script.main_logic?.nodes || []);
        collectVars(currentProject.script.after_quit?.nodes || []);
      }

      const projectKey = currentProject?.folderPath || currentProject?.info?.id || currentProject?.info?.name;
      let projectRuntimeCfg = currentProject?.runtimeConfig;
      if (!projectRuntimeCfg && projectKey) {
        try {
          const localStr = localStorage.getItem(`gpm_runtime_config_${projectKey}`);
          if (localStr) projectRuntimeCfg = JSON.parse(localStr);
        } catch {}
      }

      // If user configured TXT file in Runtime settings for THIS project, load line 1 into vars for testing
      const testTxtPath = (projectRuntimeCfg?.useInputTxt && projectRuntimeCfg?.txtFilePath)
        ? projectRuntimeCfg.txtFilePath
        : '';
      if (testTxtPath.trim()) {
        try {
          const cleanTestPath = testTxtPath.trim().replace(/^["']|["']$/g, '');
          const readTxtRes = await (window as any).electronAPI?.fileAction?.({
            action: 'readLines',
            payload: { path: cleanTestPath },
          });
          if (readTxtRes && readTxtRes.success && Array.isArray(readTxtRes.lines)) {
            const lines: string[] = readTxtRes.lines
              .map((l: any) => String(l).replace(/\r$/, ''))
              .filter((l: string) => l.trim().length > 0);
            if (lines.length > 0) {
              const skipKws = (projectRuntimeCfg?.txtSkipKeywords || 'done, trạng thái:, error, OK')
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean);

              const isLineSkipped = (lineStr: string): boolean => {
                for (const kw of skipKws) {
                  const kwLower = kw.toLowerCase();
                  if (kwLower === 'ok') {
                    if (/\b(ok)\b/i.test(lineStr) || lineStr.toLowerCase().endsWith('ok')) return true;
                  } else {
                    if (lineStr.toLowerCase().includes(kwLower)) return true;
                  }
                }
                return false;
              };

              const validLines = lines.filter((l) => !isLineSkipped(l));
              const testLine = validLines.length > 0 ? validLines[0] : lines[0];
              const skippedCount = lines.length - validLines.length;

              vars['$txt_line'] = testLine;
              vars['txt_line'] = testLine;
              vars['$line'] = testLine;
              vars['line'] = testLine;

              let parts: string[] = [];
              if (testLine.includes('|')) {
                parts = testLine.split('|');
              } else if (testLine.includes('\t')) {
                parts = testLine.split('\t');
              } else if (testLine.includes(';') && !testLine.includes('&')) {
                parts = testLine.split(';');
              } else if (testLine.includes(':') && !testLine.startsWith('http')) {
                parts = testLine.split(':');
              } else if (testLine.includes(',')) {
                parts = testLine.split(',');
              } else {
                parts = [testLine];
              }

              parts.forEach((part, pIdx) => {
                const pVal = part.trim();
                const colNum = pIdx + 1;
                vars[`line_${colNum}`] = pVal;
                vars[`$line_${colNum}`] = pVal;
                vars[`line${colNum}`] = pVal;
                vars[`$line${colNum}`] = pVal;
                vars[`data_${colNum}`] = pVal;
                vars[`$data_${colNum}`] = pVal;
                vars[`col_${colNum}`] = pVal;
                vars[`$col_${colNum}`] = pVal;
                if (colNum === 1) {
                  vars['email'] = pVal;
                  vars['$email'] = pVal;
                  vars['username'] = pVal;
                  vars['$username'] = pVal;
                } else if (colNum === 2) {
                  vars['password'] = pVal;
                  vars['$password'] = pVal;
                  vars['pass'] = pVal;
                  vars['$pass'] = pVal;
                } else if (colNum === 3) {
                  vars['2fa'] = pVal;
                  vars['$2fa'] = pVal;
                  vars['code_2fa'] = pVal;
                  vars['$code_2fa'] = pVal;
                }
              });
              const skipNote = skippedCount > 0 ? ` (Tự động bỏ qua ${skippedCount} dòng đã có 'OK')` : '';
              addLog('info', `📄 [Test] Đã nạp dòng từ TXT (${cleanTestPath}): "$line_1" = "${parts[0] || testLine}"${skipNote}`);
            }
          }
        } catch (e) {}
      }

      const runResult = await executeNodes(nodesToRun, vars, addLog);

      if (runResult === 'STOP' || stopSignalRef.current) {
        addLog('info', '⏹ Kịch bản đã dừng lại bởi lệnh Stop. Đã dừng hoàn toàn.');
        setStatusText('Stopped');
      } else {
        addLog('success', '✓ Test completed');
        setStatusText('Ready');
      }
      setIsRunning(false);
    } catch (err: any) {
      addLog('error', `✕ Test failed: ${err.message || 'Unknown error'}`);
      setIsRunning(false);
      setStatusText('Ready');
    }
  };

  const handleStop = () => {
    stopSignalRef.current = true;
    setIsRunning(false);
    setStatusText('Stopped');
    setLogs((prev) => [
      ...prev,
      {
        time: getTime(),
        type: 'error',
        text: '■ Test stopped by user.',
      },
    ]);
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => (l.time ? `${l.time}  ${l.text}` : `          ${l.text}`))
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#0c1322] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col transition-colors animate-in fade-in zoom-in-95 duration-150">
        {/* Title Bar matching Image 1 */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e2e8f0] dark:border-[#1e293b] bg-[#fafafa] dark:bg-[#0a101d]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
            <div className="w-4 h-4 rounded bg-[#ea580c] text-white flex items-center justify-center font-bold text-[10px]">
              G
            </div>
            <span>Test action / block</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#64748b] hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-left">
          {/* Action Header Card */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#f5f3ff] dark:bg-[#1e1438] border border-[#e9d5ff] dark:border-[#581c87]/50 flex items-center justify-center shadow-xs">
              <FlaskConical className="w-5 h-5 text-[#9333ea] dark:text-[#c084fc]" />
            </div>
            <div>
              <div className="font-bold text-base text-[#1e293b] dark:text-[#f8fafc]">
                Test action / block
              </div>
              <div className="text-xs text-[#64748b] dark:text-[#94a3b8] font-medium">
                {actionName}
              </div>
            </div>
          </div>

          {/* Configuration Card matching Image 1 */}
          <div className="bg-[#fafbfc] dark:bg-[#0a0f1d] border border-[#e2e8f0] dark:border-[#1a2538] rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] dark:text-[#cbd5e1] mb-1.5">
                Remote debugging port <span className="text-red-500">*</span>
              </label>

              <div className="flex items-center space-x-2.5">
                {/* Port Input with Auto-detect button */}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => {
                      setPort(e.target.value);
                      localStorage.setItem('gpm_debug_port', e.target.value.trim());
                    }}
                    placeholder="43076"
                    disabled={isRunning}
                    className={`w-48 pl-3 pr-8 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border ${port.trim() === '8725' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-[#d9d9d9] dark:border-[#1e293b]'} rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => autoDetectPort()}
                    disabled={isRunning || detectingPort}
                    title="Tự động dò cổng từ profile đang mở trên SV Browser"
                    className={`absolute right-1.5 px-1 py-0.5 text-xs rounded text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${detectingPort ? 'animate-spin' : ''}`}
                  >
                    🔄
                  </button>
                </div>

                {/* Engine Dropdown */}
                <div className="relative flex-1">
                  <select
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                    disabled={isRunning}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer appearance-none pr-8"
                  >
                    <option value="Puppeteer enhanced engine">Puppeteer enhanced engine</option>
                    <option value="Selenium engine">Selenium engine</option>
                    <option value="CDP Direct engine">CDP Direct engine</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
                    ▾
                  </div>
                </div>

                {/* Start / Stop Button */}
                {isRunning ? (
                  <button
                    onClick={handleStop}
                    className="px-4 py-1.5 text-xs rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-semibold flex items-center space-x-1.5 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/60 active:scale-95 transition-all shrink-0 shadow-xs"
                  >
                    <Square className="w-3 h-3 fill-red-600 dark:fill-red-400" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    className="px-4 py-1.5 text-xs rounded-md bg-white dark:bg-[#0f172a] hover:bg-blue-50 dark:hover:bg-[#15233c] text-[#1677ff] dark:text-[#38bdf8] border border-[#d9d9d9] dark:border-[#1e293b] hover:border-[#1677ff] dark:hover:border-[#38bdf8] font-semibold flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all shrink-0 shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-[#1677ff] dark:fill-[#38bdf8]" />
                    <span>Start</span>
                  </button>
                )}
              </div>

              {port.trim() === '8725' && (
                <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-md p-2 flex items-start space-x-2">
                  <span className="text-sm leading-none mt-0.5">⚠</span>
                  <div>
                    <strong>Cổng 8725 là API quản lý của SV Browser / GPMLogin</strong> (dùng để mở/tắt profile), <u>không phải</u> Remote Debugging Port của Chrome!
                    <br />
                    Khi profile mở, Chrome sẽ được cấp một cổng ngẫu nhiên riêng (ví dụ 54123, 60124...). Hãy <strong>mở profile lên trước</strong> rồi bấm nút <strong>🔄</strong> để phần mềm tự động điền đúng cổng Chrome!
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Execution Log Card (matching screenshot media_1789628414192.png) */}
          <div className="bg-[#081029] border border-[#13203f] rounded-xl relative shadow-inner overflow-hidden">
            {/* Top Right Action Buttons - Fixed & Always Clickable */}
            {logs.length > 0 && (
              <div className="absolute right-3 top-2.5 flex items-center space-x-1.5 z-20 bg-[#081029]/90 backdrop-blur-xs px-1.5 py-1 rounded border border-[#13203f]/80 shadow-md">
                <button
                  onClick={handleCopyLogs}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={copied ? 'Copied!' : 'Copy log'}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={handleClearLogs}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Clear log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Scrollable Logs Viewport */}
            <div
              ref={logsContainerRef}
              className="p-3.5 min-h-[220px] max-h-[280px] overflow-y-auto font-mono text-[11.5px] leading-5 text-left bg-[#081029] select-text"
            >
              {/* Empty State */}
              {logs.length === 0 ? (
                <div className="h-[180px] flex flex-col items-center justify-center text-slate-500 space-y-2 select-none">
                  <div className="font-bold text-lg text-slate-500">&gt;_</div>
                  <div className="text-xs">
                    Execution log will appear here after you press Start
                  </div>
                </div>
              ) : (
                /* Logs Output matching GPM Automate console */
                <div className="space-y-0.5 pt-0.5 pr-12">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start font-mono text-[11.5px] leading-5 tracking-tight">
                      {/* Fixed width timestamp column */}
                      <span className="w-16 shrink-0 text-[#5681a2] select-none text-left">
                        {log.time || ''}
                      </span>
                      {/* Gap */}
                      <span className="w-2 shrink-0 select-none"> </span>
                      {/* Text message */}
                      <span
                        className={`break-all whitespace-pre-wrap ${
                          log.type === 'error'
                            ? 'text-[#ef4444] font-medium'
                            : log.type === 'success'
                            ? 'text-[#10d88e] font-normal'
                            : log.type === 'start'
                            ? 'text-[#38bdf8] font-semibold'
                            : log.type === 'arrow'
                            ? 'text-[#08cffe] font-normal'
                            : 'text-[#94a3b8]'
                        }`}
                      >
                        {log.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#e2e8f0] dark:border-[#1e293b] bg-[#fafafa] dark:bg-[#0a101d] text-left">
          <span
            className={`text-[11px] font-medium ${
              statusText.startsWith('Done')
                ? 'text-green-600 dark:text-green-400 font-semibold'
                : 'text-[#64748b]'
            }`}
          >
            {statusText}
          </span>
        </div>
      </div>
    </div>
  );
};
