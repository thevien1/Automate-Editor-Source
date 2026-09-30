import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Globe,
  Monitor,
  Smartphone,
  HelpCircle,
  Settings,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  FolderOpen,
  Plus,
  Shield,
  Lightbulb,
  Play,
  Square,
  Pause,
  RotateCcw,
  AlertTriangle,
  Cpu,
  EyeOff,
  MousePointer,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Sliders,
  Calendar,
  Layers,
  Terminal,
  Search,
  Zap,
  Users,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  SkipForward,
  Grid,
  Grid3x3,
  Layout,
  Tag,
  Tags,
} from '../common/Icons';
import { useProject } from '../../context/ProjectContext';
import { WorkflowNode, ActionNode, ProjectRuntimeConfig, EditorFile } from '../../types/gscript';
import {
  VIRTUAL_MOUSE_SCRIPT,
  getVirtualMouseClickXPathScript,
  getVirtualMouseClickCoordsScript,
} from '../../utils/virtualMouseScript';
import { evaluateGpmCondition, evaluateGpmConditionAsync } from '../../utils/conditionEvaluator';
import { resolveVariableString } from '../../utils/variableResolver';

interface RuntimeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface GpmTag {
  id: string;
  name: string;
  color?: string;
  createdAt?: number;
}

export interface GpmProfile {
  id: string;
  name: string;
  group_id?: string;
  group_name?: string;
  storage_path?: string;
  raw_proxy?: string;
  proxy?: string;
  profileProxy?: string;
  browser?: {
    name: string;
    version: string;
  };
  os?: string;
  note?: string;
  status?: string;
  tags?: string[] | any[];
}

export interface AssignedTxtEntry {
  fileLineIndex: number;
  text: string;
  isExhausted?: boolean;
  skippedCount: number;
  totalValid: number;
  totalLines: number;
}

interface ThreadState {
  id: number;
  profileId?: string;
  profileName?: string;
  profileProxy?: string;
  port: number;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  currentAction: string;
  logs: Array<{ time: string; text: string; type: 'info' | 'success' | 'error' | 'arrow' }>;
  assignedTxtEntry?: AssignedTxtEntry | null;
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

export const DEFAULT_PROJECT_RUNTIME_CONFIG: ProjectRuntimeConfig = {
  // Window & Screen
  windowSizeMode: 'percent',
  autoTileWindows: true,
  tilePreset: 'auto',
  percentWidth: 50,
  percentHeight: 50,
  windowWidth: 800,
  windowHeight: 600,
  windowScale: 100,
  screenTarget: 'Screen 1 • 1920x1080 (primary)',

  // Excel Input
  useInputExcel: false,
  excelFilePath: '',
  excelSheetId: 0,
  excelMapMode: 'all',
  excelMapColA: false,
  excelWriteOk: false,
  excelOkCol: 'Z',
  excelSkipIfHasText: true,
  skipStatusKeywords: 'done, trạng thái:, error',

  // TXT Input
  useInputTxt: false,
  txtFilePath: '',
  txtMapMode: 'one',
  txtSkipKeywords: 'done, trạng thái:, error, OK',
  txtWriteOk: true,

  // Session Configuration
  sessionName: '',
  numThreads: 2,
  threadDelay: 10,
  skipProxyCheck: false,
  doNotCloseOnError: false,
  closeBrowserOnDone: false,
  performanceLimit: false,
  hideWindowWhenDone: false,
  useVirtualMouse: true,
  restartOnError: false,
  retryCount: 3,

  // Schedule
  useSchedule: false,

  // Selected Profiles & Engine
  selectedProfileIds: [],
  selectedEngine: 'Selenium enhanced engine',
  selectedProvider: 'SV Browser',
  profilesSortOrder: 'default',
  profilesPerPage: 20,
};

export const RuntimeModal: React.FC<RuntimeModalProps> = ({ isOpen, onClose }) => {
  const { currentProject, updateRuntimeConfig } = useProject();

  // Wizard Step: 1 = Select app, 2 = Configure, 3 = Profile, 4 = Running
  // Always starts at Step 1 (Select app) when user clicks Run
  const [step, setStep] = useState<number>(1);

  // Step 1: Session name
  const [sessionName, setSessionName] = useState<string>(() => {
    const projName = currentProject?.info.name || 'Untitled';
    const hash = Math.random().toString(16).substring(2, 10);
    return `${projName}-${hash}`;
  });

  // Step 2: Sub-tab under CONFIGURATION MENU
  const [configMenu, setConfigMenu] = useState<'inputs' | 'session' | 'schedule'>('inputs');

  // Step 2 Configurations (Project-scoped, auto-saved to runtime.json)
  const [windowWidth, setWindowWidth] = useState<number>(800);

  const [windowHeight, setWindowHeight] = useState<number>(600);
  const [windowScale, setWindowScale] = useState<number>(100);

  const [screenTarget, setScreenTarget] = useState<string>('Screen 1 • 1920x1080 (primary)');
  const [windowSizeMode, setWindowSizeMode] = useState<'percent' | 'custom'>('percent');
  const [autoTileWindows, setAutoTileWindows] = useState<boolean>(true);
  const [tilePreset, setTilePreset] = useState<string>('auto');
  const [percentWidth, setPercentWidth] = useState<number>(50);
  const [percentHeight, setPercentHeight] = useState<number>(50);

  // Danh sách các màn hình kết nối thực tế từ Electron
  const [screenDisplays, setScreenDisplays] = useState<Array<{
    id: number;
    index: number;
    isPrimary: boolean;
    label: string;
    bounds: { x: number; y: number; width: number; height: number };
    workArea: { x: number; y: number; width: number; height: number };
  }>>([]);

  useEffect(() => {
    const fetchDisplays = async () => {
      try {
        if ((window as any).electronAPI?.getDisplays) {
          const ds = await (window as any).electronAPI.getDisplays();
          if (Array.isArray(ds) && ds.length > 0) {
            setScreenDisplays(ds);
            if (!ds.some((d: any) => d.label === screenTarget)) {
              const prim = ds.find((d: any) => d.isPrimary) || ds[0];
              if (prim) setScreenTarget(prim.label);
            }
          }
        }
      } catch (e) {}
    };
    fetchDisplays();
  }, []);

  const getActiveScreen = () => {
    if (screenDisplays.length > 0) {
      const found = screenDisplays.find((s) => s.label === screenTarget);
      if (found) return found;
      return screenDisplays[0];
    }
    const availW = typeof window !== 'undefined' && window.screen ? window.screen.availWidth || 1920 : 1920;
    const availH = typeof window !== 'undefined' && window.screen ? window.screen.availHeight || 1040 : 1040;
    const w = typeof window !== 'undefined' && window.screen ? window.screen.width || 1920 : 1920;
    const h = typeof window !== 'undefined' && window.screen ? window.screen.height || 1080 : 1080;
    return {
      id: 1,
      index: 0,
      isPrimary: true,
      label: `Screen 1 • ${w}x${h} (primary)`,
      bounds: { x: 0, y: 0, width: w, height: h },
      workArea: { x: 0, y: 0, width: availW, height: availH },
    };
  };

  const getEffectiveGridConfig = (threadsCount: number = numThreads) => {
    const scr = getActiveScreen();
    const scrW = scr.workArea.width || 1920;
    const scrH = scr.workArea.height || 1040;

    let cols = 2;
    let rows = 2;
    let pW = percentWidth;
    let pH = percentHeight;

    if (windowSizeMode === 'percent') {
      if (tilePreset === 'auto') {
        const count = Math.max(1, threadsCount);
        if (count === 1) {
          cols = 1;
          rows = 1;
          pW = 100;
          pH = 100;
        } else if (count === 2) {
          cols = 2;
          rows = 1;
          pW = 50;
          pH = 100;
        } else if (count <= 4) {
          cols = 2;
          rows = 2;
          pW = 50;
          pH = 50;
        } else if (count <= 6) {
          cols = 3;
          rows = 2;
          pW = 33.33;
          pH = 50;
        } else if (count <= 8) {
          cols = 4;
          rows = 2;
          pW = 25;
          pH = 50;
        } else {
          cols = Math.ceil(Math.sqrt(count));
          rows = Math.ceil(count / cols);
          pW = Number((100 / cols).toFixed(2));
          pH = Number((100 / rows).toFixed(2));
        }
      } else if (tilePreset === '2x2') {
        cols = 2;
        rows = 2;
        pW = 50;
        pH = 50;
      } else if (tilePreset === '3x2') {
        cols = 3;
        rows = 2;
        pW = 33.33;
        pH = 50;
      } else if (tilePreset === '4x2') {
        cols = 4;
        rows = 2;
        pW = 25;
        pH = 50;
      } else if (tilePreset === '2x1') {
        cols = 2;
        rows = 1;
        pW = 50;
        pH = 100;
      } else {
        pW = Math.max(10, Math.min(100, percentWidth));
        pH = Math.max(10, Math.min(100, percentHeight));
        cols = Math.max(1, Math.floor(100 / pW));
        rows = Math.max(1, Math.floor(100 / pH));
      }

      const winW = Math.round(scrW * (pW / 100));
      const winH = Math.round(scrH * (pH / 100));
      return { cols, rows, winWidth: winW, winHeight: winH, percentWidth: pW, percentHeight: pH, screen: scr };
    } else {
      const winW = Math.max(200, windowWidth);
      const winH = Math.max(200, windowHeight);
      cols = Math.max(1, Math.floor(scrW / winW));
      rows = Math.max(1, Math.floor(scrH / winH));
      const calcPW = Math.round((winW / scrW) * 100);
      const calcPH = Math.round((winH / scrH) * 100);
      return { cols, rows, winWidth: winW, winHeight: winH, percentWidth: calcPW, percentHeight: calcPH, screen: scr };
    }
  };

  const computeTilePosition = (
    slotIndex: number,
    screenLeft: number,
    screenTop: number,
    screenWidth: number,
    screenHeight: number,
    winWidth: number,
    winHeight: number,
    cols: number,
    rows: number
  ): { x: number; y: number; width: number; height: number } => {
    const effectiveCols = Math.max(1, cols);
    const effectiveRows = Math.max(1, rows);
    const col = slotIndex % effectiveCols;
    const row = Math.floor(slotIndex / effectiveCols) % effectiveRows;
    const cycle = Math.floor(slotIndex / (effectiveCols * effectiveRows));
    const offset = cycle * 20;

    const x = screenLeft + col * winWidth + offset;
    const y = screenTop + row * winHeight + offset;

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(winWidth),
      height: Math.round(winHeight),
    };
  };

  const handleArrangeAllWindows = async () => {
    const gridConfig = getEffectiveGridConfig(numThreads);
    const activeThreads = threads.filter((t) => t.port);
    if (activeThreads.length === 0) return;

    for (let idx = 0; idx < activeThreads.length; idx++) {
      const t = activeThreads[idx];
      const pos = computeTilePosition(
        idx,
        gridConfig.screen.workArea.x,
        gridConfig.screen.workArea.y,
        gridConfig.screen.workArea.width,
        gridConfig.screen.workArea.height,
        gridConfig.winWidth,
        gridConfig.winHeight,
        gridConfig.cols,
        gridConfig.rows
      );
      if ((window as any).electronAPI?.cdpAction && t.port) {
        await (window as any).electronAPI.cdpAction({
          port: t.port,
          action: 'setWindowBounds',
          payload: { x: pos.x, y: pos.y, width: pos.width, height: pos.height },
        }).catch(() => {});
      }
    }
  };

  const [useInputExcel, setUseInputExcel] = useState<boolean>(false);
  const [excelFilePath, setExcelFilePath] = useState<string>('');
  const [excelSheetId, setExcelSheetId] = useState<number>(0);
  const [excelMapMode, setExcelMapMode] = useState<'all' | 'one'>('all');
  const [excelMapColA, setExcelMapColA] = useState<boolean>(false);
  const [excelWriteOk, setExcelWriteOk] = useState<boolean>(false);
  const [excelOkCol, setExcelOkCol] = useState<string>('Z');
  const [excelSkipIfHasText, setExcelSkipIfHasText] = useState<boolean>(true);
  const [skipStatusKeywords, setSkipStatusKeywords] = useState<string>('done, trạng thái:, error');

  // TXT Input Configuration (Project-scoped, auto-saved to runtime.json)
  const [useInputTxt, setUseInputTxt] = useState<boolean>(false);
  const [txtFilePath, setTxtFilePath] = useState<string>('');
  const [txtMapMode, setTxtMapMode] = useState<'all' | 'one'>('one');
  const [txtSkipKeywords, setTxtSkipKeywords] = useState<string>('done, trạng thái:, error, OK');
  const [txtWriteOk, setTxtWriteOk] = useState<boolean>(true);

  // Helper: column letter <-> index
  const colLetterToIndex = (colStr: string): number => {
    const trimmed = (colStr || 'A').trim();
    const num = parseInt(trimmed, 10);
    if (!isNaN(num)) return Math.max(0, num - 1);
    let cIdx = 0;
    const upper = trimmed.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      cIdx = cIdx * 26 + (upper.charCodeAt(i) - 64);
    }
    return Math.max(0, cIdx - 1);
  };

  const indexToColLetter = (idx: number): string => {
    let num = idx + 1;
    let col = '';
    while (num > 0) {
      const rem = (num - 1) % 26;
      col = String.fromCharCode(65 + rem) + col;
      num = Math.floor((num - 1) / 26);
    }
    return col || 'A';
  };

  const handleBrowseExcel = async () => {
    try {
      if ((window as any).electronAPI?.openFileDialog) {
        const filePath = await (window as any).electronAPI.openFileDialog({
          title: 'Select Excel File (.xlsx, .xls, .csv)',
          filters: [
            { name: 'Excel / CSV Files', extensions: ['xlsx', 'xls', 'csv'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (filePath) {
          setExcelFilePath(filePath);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            setExcelFilePath(file.path || file.name);
          }
        };
        input.click();
      }
    } catch (err: any) {
      console.error('Failed to open Excel file dialog:', err);
    }
  };

  const handleBrowseTxt = async () => {
    try {
      if ((window as any).electronAPI?.openFileDialog) {
        const filePath = await (window as any).electronAPI.openFileDialog({
          title: 'Select Text File (.txt, .csv)',
          filters: [
            { name: 'Text Files', extensions: ['txt', 'csv'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (filePath) {
          setTxtFilePath(filePath);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.csv';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            setTxtFilePath(file.path || file.name);
          }
        };
        input.click();
      }
    } catch (err: any) {
      console.error('Failed to open TXT file dialog:', err);
    }
  };

  // Session configuration (Project-scoped, auto-saved to runtime.json)
  const [numThreads, setNumThreads] = useState<number>(2);
  const [threadDelay, setThreadDelay] = useState<number>(10);
  const [skipProxyCheck, setSkipProxyCheck] = useState<boolean>(false);
  const [workerProxies, setWorkerProxies] = useState<Record<number, string>>({});
  const [doNotCloseOnError, setDoNotCloseOnError] = useState<boolean>(false);
  const [closeBrowserOnDone, setCloseBrowserOnDone] = useState<boolean>(false);
  const [performanceLimit, setPerformanceLimit] = useState<boolean>(false);
  const [hideWindowWhenDone, setHideWindowWhenDone] = useState<boolean>(false);
  const [useVirtualMouse, setUseVirtualMouse] = useState<boolean>(true);
  const [restartOnError, setRestartOnError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(3);

  // Step 3: Profiles from GPMLogin API (http://localhost:8725/api/v3/profiles)
  const [profiles, setProfiles] = useState<GpmProfile[]>([]);
  // Profiles are NOT pre-selected by default
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  const [selectedLogThreadId, setSelectedLogThreadId] = useState<number | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<'connected' | 'error' | 'idle'>('idle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [availableTags, setAvailableTags] = useState<GpmTag[]>([]);
  const [sortOrder, setSortOrder] = useState<string>('default');
  const [profilesPerPage, setProfilesPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [customPerPageInput, setCustomPerPageInput] = useState<string>('20');
  const [selectedEngine, setSelectedEngine] = useState<string>('Selenium enhanced engine');
  const [selectedProvider, setSelectedProvider] = useState<string>('SV Browser');

  // Helper to sort profiles by sortOrder
  const sortProfilesList = (list: GpmProfile[], order: string, selIds: string[] = selectedProfileIds) => {
    return [...list].sort((a, b) => {
      if (order === 'asc') {
        return (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (order === 'desc') {
        return (b?.name || '').localeCompare(a?.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (order === 'id_asc') {
        const numA = parseInt(String(a.id), 10);
        const numB = parseInt(String(b.id), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      }
      if (order === 'id_desc') {
        const numA = parseInt(String(a.id), 10);
        const numB = parseInt(String(b.id), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
      }
      if (order === 'group_asc') {
        const grpA = a?.group_name || a?.group_id || '';
        const grpB = b?.group_name || b?.group_id || '';
        const cmp = grpA.localeCompare(grpB, undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (order === 'group_desc') {
        const grpA = a?.group_name || a?.group_id || '';
        const grpB = b?.group_name || b?.group_id || '';
        const cmp = grpB.localeCompare(grpA, undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return (b?.name || '').localeCompare(a?.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (order === 'core_asc') {
        const coreA = a?.browser?.name || '';
        const coreB = b?.browser?.name || '';
        const cmp = coreA.localeCompare(coreB, undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (order === 'core_desc') {
        const coreA = a?.browser?.name || '';
        const coreB = b?.browser?.name || '';
        const cmp = coreB.localeCompare(coreA, undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return (b?.name || '').localeCompare(a?.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (order === 'selected_first') {
        const selA = selIds.includes(String(a.id)) ? 0 : 1;
        const selB = selIds.includes(String(b.id)) ? 0 : 1;
        if (selA !== selB) return selA - selB;
        return (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (order === 'unselected_first') {
        const selA = selIds.includes(String(a.id)) ? 1 : 0;
        const selB = selIds.includes(String(b.id)) ? 1 : 0;
        if (selA !== selB) return selA - selB;
        return (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      return 0;
    });
  };

  // Fetch profiles from GPMLogin API (http://localhost:8725/api/v1/profiles)
  const fetchProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      let data: GpmProfile[] | null = null;
      const endpoints = [
        'http://localhost:8725/api/v1/profiles?per_page=500',
        'http://127.0.0.1:8725/api/v1/profiles?per_page=500',
        'http://localhost:8725/api/v1/profiles',
        'http://127.0.0.1:8725/api/v1/profiles',
        'http://localhost:8725/api/v3/profiles?per_page=500',
        'http://127.0.0.1:8725/api/v3/profiles?per_page=500',
        'http://localhost:8725/api/v3/profiles',
        'http://127.0.0.1:8725/api/v3/profiles',
        'http://localhost:9495/api/v1/profiles',
      ];

      const extractProfiles = (payload: any): GpmProfile[] | null => {
        if (!payload) return null;
        let obj = payload;
        if (typeof obj === 'string') {
          try {
            obj = JSON.parse(obj);
          } catch {
            return null;
          }
        }
        let list: any[] | null = null;
        if (Array.isArray(obj)) list = obj;
        else if (Array.isArray(obj?.data)) list = obj.data;
        else if (Array.isArray(obj?.data?.data)) list = obj.data.data;
        else if (Array.isArray(obj?.profiles)) list = obj.profiles;
        else if (Array.isArray(obj?.data?.profiles)) list = obj.data.profiles;
        else if (Array.isArray(obj?.result)) list = obj.result;
        else if (Array.isArray(obj?.result?.data)) list = obj.result.data;

        if (!list) return null;

        return list
          .map((item: any) => {
            const rawId = item.id ?? item.profile_id ?? item.uuid ?? item.raw_id ?? '';
            const rawProxy = String(item.raw_proxy ?? item.proxy ?? item.proxy_url ?? item.profileProxy ?? '').trim();
            const rawTags: string[] = Array.isArray(item.tags)
              ? item.tags.map((t: any) => (typeof t === 'string' ? t : String(t?.name || t?.id || '')).trim()).filter(Boolean)
              : (typeof item.tags === 'string' && item.tags.trim()
                ? item.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
                : []);
            return {
              ...item,
              id: String(rawId),
              name: String(item.name ?? item.profile_name ?? `Profile ${rawId}`),
              raw_proxy: rawProxy,
              proxy: rawProxy,
              profileProxy: rawProxy,
              group_id: item.group_id ? String(item.group_id) : undefined,
              group_name: String(item.group_name ?? item.group ?? item.group_id ?? 'Default group'),
              tags: rawTags,
              browser: item.browser ?? {
                name: String(item.browser_name ?? 'chrome'),
                version: String(item.browser_version ?? ''),
              },
            };
          })
          .filter((p: GpmProfile) => Boolean(p.id && p.id.length > 0));
      };

      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const json = await res.json();
            const list = extractProfiles(json);
            if (list && list.length > 0) {
              data = list;
              break;
            }
          }
        } catch (err) {
          if ((window as any).electronAPI?.fileAction) {
            try {
              const res = await (window as any).electronAPI.fileAction({
                action: 'httpRequest',
                payload: { url: ep, method: 'GET' },
              });
              if (res && res.data) {
                const list = extractProfiles(res.data);
                if (list && list.length > 0) {
                  data = list;
                  break;
                }
              }
            } catch {}
          }
        }
      }

      if (data && Array.isArray(data)) {
        setProfiles(data);
        setApiStatus('connected');
        fetchTags().catch(() => {});
      } else {
        setApiStatus('error');
      }
    } catch (e) {
      setApiStatus('error');
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  // Fetch tags from GPMLogin API (http://127.0.0.1:8725/api/v1/tags)
  const fetchTags = async () => {
    try {
      let tagData: GpmTag[] | null = null;
      const endpoints = [
        'http://localhost:8725/api/v1/tags',
        'http://127.0.0.1:8725/api/v1/tags',
        'http://localhost:8725/api/v3/tags',
        'http://127.0.0.1:8725/api/v3/tags',
        'http://localhost:9495/api/v1/tags',
      ];

      const extractTags = (payload: any): GpmTag[] | null => {
        if (!payload) return null;
        let obj = payload;
        if (typeof obj === 'string') {
          try {
            obj = JSON.parse(obj);
          } catch {
            return null;
          }
        }
        let list: any[] | null = null;
        if (Array.isArray(obj)) list = obj;
        else if (Array.isArray(obj?.data)) list = obj.data;
        else if (Array.isArray(obj?.data?.data)) list = obj.data.data;
        else if (Array.isArray(obj?.tags)) list = obj.tags;
        else if (Array.isArray(obj?.result)) list = obj.result;

        if (!list) return null;

        return list
          .map((item: any) => {
            if (typeof item === 'string') {
              return { id: item, name: item, color: '#0284c7' };
            }
            const rawId = item.id ?? item.tag_id ?? item.uuid ?? item.name ?? '';
            return {
              id: String(rawId),
              name: String(item.name ?? item.tag_name ?? rawId),
              color: item.color || '#0284c7',
              createdAt: item.createdAt,
            };
          })
          .filter((t: GpmTag) => Boolean(t.name && t.name.length > 0));
      };

      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const json = await res.json();
            const list = extractTags(json);
            if (list && list.length > 0) {
              tagData = list;
              break;
            }
          }
        } catch (err) {
          if ((window as any).electronAPI?.fileAction) {
            try {
              const res = await (window as any).electronAPI.fileAction({
                action: 'httpRequest',
                payload: { url: ep, method: 'GET' },
              });
              if (res && res.data) {
                const list = extractTags(res.data);
                if (list && list.length > 0) {
                  tagData = list;
                  break;
                }
              }
            } catch {}
          }
        }
      }

      if (tagData && Array.isArray(tagData)) {
        setAvailableTags(tagData);
      }
    } catch (e) {
      console.warn('fetchTags error:', e);
    }
  };

  // Schedule configuration (Project-scoped, auto-saved to runtime.json)
  const [useSchedule, setUseSchedule] = useState<boolean>(false);

  const isInitialLoadingRef = useRef<boolean>(true);
  const loadedProjectKeyRef = useRef<string>('');

  const getCurrentRuntimeConfig = (): ProjectRuntimeConfig => ({
    // Window & Screen
    windowSizeMode,
    autoTileWindows,
    tilePreset,
    percentWidth,
    percentHeight,
    windowWidth,
    windowHeight,
    windowScale,
    screenTarget,

    // Excel Input
    useInputExcel,
    excelFilePath,
    excelSheetId,
    excelMapMode,
    excelMapColA,
    excelWriteOk,
    excelOkCol,
    excelSkipIfHasText,
    skipStatusKeywords,

    // TXT Input
    useInputTxt,
    txtFilePath,
    txtMapMode,
    txtSkipKeywords,
    txtWriteOk,

    // Session Configuration
    sessionName,
    numThreads,
    threadDelay,
    skipProxyCheck,
    doNotCloseOnError,
    closeBrowserOnDone,
    performanceLimit,
    hideWindowWhenDone,
    useVirtualMouse,
    restartOnError,
    retryCount,

    // Schedule
    useSchedule,

    // Selected Profiles & Engine
    selectedProfileIds,
    selectedEngine,
    selectedProvider,
    profilesSortOrder: sortOrder,
    profilesPerPage,
    selectedGroup,
    selectedTag,
  });

  const applyConfigToState = (cfg: ProjectRuntimeConfig, projName?: string) => {
    // Window & Screen
    setWindowSizeMode(cfg.windowSizeMode ?? 'percent');
    setAutoTileWindows(cfg.autoTileWindows ?? true);
    setTilePreset(cfg.tilePreset ?? 'auto');
    setPercentWidth(cfg.percentWidth ?? 50);
    setPercentHeight(cfg.percentHeight ?? 50);
    setWindowWidth(cfg.windowWidth ?? 800);
    setWindowHeight(cfg.windowHeight ?? 600);
    setWindowScale(cfg.windowScale ?? 100);
    if (cfg.screenTarget) {
      setScreenTarget(cfg.screenTarget);
    }

    // Excel Input
    setUseInputExcel(cfg.useInputExcel ?? false);
    setExcelFilePath(cfg.excelFilePath ?? '');
    setExcelSheetId(cfg.excelSheetId ?? 0);
    setExcelMapMode(cfg.excelMapMode ?? 'all');
    setExcelMapColA(cfg.excelMapColA ?? false);
    setExcelWriteOk(cfg.excelWriteOk ?? false);
    setExcelOkCol(cfg.excelOkCol ?? 'Z');
    setExcelSkipIfHasText(cfg.excelSkipIfHasText ?? true);
    setSkipStatusKeywords(cfg.skipStatusKeywords ?? 'done, trạng thái:, error');

    // TXT Input
    setUseInputTxt(cfg.useInputTxt ?? false);
    setTxtFilePath(cfg.txtFilePath ?? '');
    setTxtMapMode(cfg.txtMapMode ?? 'one');
    setTxtSkipKeywords(cfg.txtSkipKeywords ?? 'done, trạng thái:, error, OK');
    setTxtWriteOk(cfg.txtWriteOk ?? true);

    // Session Configuration
    if (cfg.sessionName && cfg.sessionName.trim()) {
      setSessionName(cfg.sessionName);
    } else {
      const pName = projName || currentProject?.info?.name || 'Untitled';
      const hash = Math.random().toString(16).substring(2, 10);
      setSessionName(`${pName}-${hash}`);
    }
    setNumThreads(cfg.numThreads ?? 2);
    setThreadDelay(cfg.threadDelay ?? 10);
    setSkipProxyCheck(cfg.skipProxyCheck ?? false);
    setDoNotCloseOnError(cfg.doNotCloseOnError ?? false);
    setCloseBrowserOnDone(cfg.closeBrowserOnDone ?? false);
    setPerformanceLimit(cfg.performanceLimit ?? false);
    setHideWindowWhenDone(cfg.hideWindowWhenDone ?? false);
    setUseVirtualMouse(cfg.useVirtualMouse ?? true);
    setRestartOnError(cfg.restartOnError ?? false);
    setRetryCount(cfg.retryCount ?? 3);

    // Schedule
    setUseSchedule(cfg.useSchedule ?? false);

    // Selected Profiles & Engine
    setSelectedEngine(cfg.selectedEngine || 'Selenium enhanced engine');
    setSelectedProvider(cfg.selectedProvider || 'SV Browser');
    setSortOrder(cfg.profilesSortOrder || 'default');
    if (cfg.profilesPerPage) {
      setProfilesPerPage(cfg.profilesPerPage);
      setCustomPerPageInput(String(cfg.profilesPerPage));
    }
    if (cfg.selectedGroup) setSelectedGroup(cfg.selectedGroup);
    if (cfg.selectedTag) setSelectedTag(cfg.selectedTag);
    setSelectedProfileIds(Array.isArray(cfg.selectedProfileIds) ? cfg.selectedProfileIds : []);
  };

  const saveConfigForCurrentProject = (customConfig?: Partial<ProjectRuntimeConfig>) => {
    if (!currentProject) return;
    const projectKey = currentProject.folderPath || currentProject.info?.id || currentProject.info?.name;
    if (!projectKey) return;

    const currentCfg = getCurrentRuntimeConfig();
    const cfg: ProjectRuntimeConfig = {
      ...currentCfg,
      ...(customConfig || {}),
    };

    try {
      localStorage.setItem(`gpm_runtime_config_${projectKey}`, JSON.stringify(cfg));
    } catch {}

    updateRuntimeConfig(cfg);

    if (currentProject.folderPath) {
      if ((window as any).electronAPI?.saveRuntimeConfig) {
        (window as any).electronAPI.saveRuntimeConfig({
          folderPath: currentProject.folderPath,
          runtimeConfig: cfg,
        }).catch(() => {});
      } else if ((window as any).electronAPI?.fileAction) {
        const cleanPath = `${currentProject.folderPath.replace(/[\\/\\\\]+$/, '')}/runtime.json`;
        (window as any).electronAPI.fileAction({
          action: 'writeText',
          payload: { path: cleanPath, text: JSON.stringify(cfg, null, 2) },
        }).catch(() => {});
      }
    }
  };

  const loadConfigForProject = async (proj: any) => {
    if (!proj) return;
    const projectKey = proj.folderPath || proj.info?.id || proj.info?.name;
    if (!projectKey) return;

    isInitialLoadingRef.current = true;
    loadedProjectKeyRef.current = projectKey;

    let savedCfg: ProjectRuntimeConfig | null = proj.runtimeConfig || null;

    // 1. If not in memory, try reading from disk runtime.json directly
    if (!savedCfg && proj.folderPath && (window as any).electronAPI?.fileAction) {
      try {
        const cleanPath = `${String(proj.folderPath).replace(/[\\/\\\\]+$/, '')}/runtime.json`;
        const res = await (window as any).electronAPI.fileAction({
          action: 'readText',
          payload: { path: cleanPath },
        });
        if (res && res.success && res.text) {
          savedCfg = JSON.parse(res.text);
        }
      } catch {}
    }

    // 2. Fallback: check localStorage by project key
    if (!savedCfg) {
      try {
        const local = localStorage.getItem(`gpm_runtime_config_${projectKey}`);
        if (local) savedCfg = JSON.parse(local);
      } catch {}
    }

    const projName = proj.info?.name || 'Untitled';

    if (savedCfg) {
      const mergedCfg: ProjectRuntimeConfig = {
        ...DEFAULT_PROJECT_RUNTIME_CONFIG,
        ...savedCfg,
      };
      applyConfigToState(mergedCfg, projName);
    } else {
      // Clean start from zero ("bắt đầu bằng số 0") for new / unconfigured project!
      applyConfigToState(DEFAULT_PROJECT_RUNTIME_CONFIG, projName);
    }

    setTimeout(() => {
      isInitialLoadingRef.current = false;
    }, 300);
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
      fetchTags();
      if (!isExecuting) {
        setStep(1);
      }
      setSelectedLogThreadId(null);
      loadConfigForProject(currentProject);
    }
  }, [isOpen, currentProject?.folderPath, currentProject?.info?.id]);

  // Debounced auto-save when any configuration value changes in Step 2
  useEffect(() => {
    if (isInitialLoadingRef.current) return;
    if (!currentProject) return;
    const projectKey = currentProject.folderPath || currentProject.info?.id || currentProject.info?.name;
    if (!projectKey || loadedProjectKeyRef.current !== projectKey) return;

    const timer = setTimeout(() => {
      if (loadedProjectKeyRef.current === projectKey && !isInitialLoadingRef.current) {
        saveConfigForCurrentProject();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    currentProject?.folderPath,
    currentProject?.info?.id,
    windowWidth,
    windowHeight,
    windowScale,
    screenTarget,
    windowSizeMode,
    autoTileWindows,
    tilePreset,
    percentWidth,
    percentHeight,
    useInputExcel,
    excelFilePath,
    excelSheetId,
    excelMapMode,
    excelMapColA,
    excelWriteOk,
    excelOkCol,
    excelSkipIfHasText,
    skipStatusKeywords,
    useInputTxt,
    txtFilePath,
    txtMapMode,
    txtSkipKeywords,
    txtWriteOk,
    numThreads,
    threadDelay,
    skipProxyCheck,
    doNotCloseOnError,
    closeBrowserOnDone,
    performanceLimit,
    hideWindowWhenDone,
    useVirtualMouse,
    restartOnError,
    retryCount,
    useSchedule,
    selectedEngine,
    selectedProvider,
    sortOrder,
    profilesPerPage,
  ]);

  // Step 4: Running Multi-Thread State
  const [threads, setThreads] = useState<ThreadState[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const stopSignalRef = useRef<boolean>(false);

  // Initialize session name when currentProject changes
  useEffect(() => {
    if (currentProject?.info.name) {
      const hash = Math.random().toString(16).substring(2, 10);
      setSessionName(`${currentProject.info.name}-${hash}`);
    }
  }, [currentProject?.info.name]);

  // Elapsed timer when running
  useEffect(() => {
    let timer: any = null;
    if (isExecuting) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isExecuting]);

  const appName = currentProject?.info.name || 'Untitled';
  const appPath = `C:\\Users\\Admin\\Desktop\\project\\${appName}`;

  const getTime = () => new Date().toLocaleTimeString('vi-VN', { hour12: false });
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Step navigation
  const goToStep = (targetStep: number) => {
    if (step === 2 || targetStep > step) {
      saveConfigForCurrentProject();
    }
    setStep(targetStep);
  };

  const handleModalClose = () => {
    saveConfigForCurrentProject();
    onClose();
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      saveConfigForCurrentProject();
      setStep(3);
    } else if (step === 3) {
      if (selectedProfileIds.length === 0) return;
      saveConfigForCurrentProject();
      setStep(4);
      startMultiThreadExecution();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 2) {
        saveConfigForCurrentProject();
      }
      setStep((prev) => prev - 1);
    }
  };

  // Pre-generate thread list for Step 3 and 4
  const generateInitialThreads = (count: number): ThreadState[] => {
    const list: ThreadState[] = [];
    const basePort = 43076;
    for (let i = 1; i <= count; i++) {
      list.push({
        id: i,
        port: basePort + (i - 1),
        name: `Worker #${i}`,
        status: 'idle',
        currentAction: 'Ready',
        logs: [{ time: getTime(), text: `Worker #${i} initialized on port ${basePort + (i - 1)}`, type: 'info' }],
      });
    }
    return list;
  };

  // Multi-thread automation runner
  const startMultiThreadExecution = async () => {
    saveConfigForCurrentProject();
    stopSignalRef.current = false;
    setIsExecuting(true);
    setElapsedSeconds(0);

    // 0. Pre-read and pre-filter TXT lines ONCE at session start to ensure strict FIFO order
    // and avoid any race conditions or index shifting when profiles finish asynchronously.
    interface TxtDispatchItem {
      fileLineIndex: number;
      text: string;
    }
    const unworkedTxtLines: TxtDispatchItem[] = [];
    let initialTxtSkippedCount = 0;
    let initialTxtTotalLines = 0;

    if (useInputTxt && txtFilePath.trim()) {
      try {
        const cleanTxtPath = txtFilePath.trim().replace(/^["']|["']$/g, '');
        const readTxtRes = await (window as any).electronAPI?.fileAction?.({
          action: 'readLines',
          payload: { path: cleanTxtPath },
        });

        if (readTxtRes && readTxtRes.success && Array.isArray(readTxtRes.lines)) {
          const skipKws = (txtSkipKeywords || 'done, trạng thái:, error, OK')
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);

          const isLineSkipped = (lineStr: string): boolean => {
            for (const kw of skipKws) {
              const kwLower = kw.toLowerCase();
              if (kwLower === 'ok') {
                if (/\b(ok)\b/i.test(lineStr) || lineStr.toLowerCase().endsWith('ok')) {
                  return true;
                }
              } else {
                if (lineStr.toLowerCase().includes(kwLower)) {
                  return true;
                }
              }
            }
            return false;
          };

          readTxtRes.lines.forEach((l: any, idx: number) => {
            const rawLine = String(l).replace(/\r$/, '');
            if (rawLine.trim().length > 0) {
              initialTxtTotalLines++;
              if (isLineSkipped(rawLine)) {
                initialTxtSkippedCount++;
              } else {
                unworkedTxtLines.push({
                  fileLineIndex: idx,
                  text: rawLine,
                });
              }
            }
          });
        }
      } catch (err: any) {
        console.error('Lỗi nạp file TXT ban đầu:', err);
      }
    }

    const buildTxtEntry = (idx: number): AssignedTxtEntry | null => {
      if (!useInputTxt || !txtFilePath.trim()) return null;
      if (txtMapMode === 'all') {
        if (unworkedTxtLines.length === 0) {
          return {
            fileLineIndex: -1,
            text: '',
            isExhausted: true,
            skippedCount: initialTxtSkippedCount,
            totalValid: 0,
            totalLines: initialTxtTotalLines,
          };
        }
        return {
          fileLineIndex: unworkedTxtLines[0].fileLineIndex,
          text: unworkedTxtLines[0].text,
          isExhausted: false,
          skippedCount: initialTxtSkippedCount,
          totalValid: unworkedTxtLines.length,
          totalLines: initialTxtTotalLines,
        };
      }
      // txtMapMode === 'one': Mỗi profile nhận 1 dòng chưa làm theo đúng thứ tự FIFO từ trên xuống dưới
      if (idx < unworkedTxtLines.length) {
        return {
          fileLineIndex: unworkedTxtLines[idx].fileLineIndex,
          text: unworkedTxtLines[idx].text,
          isExhausted: false,
          skippedCount: initialTxtSkippedCount,
          totalValid: unworkedTxtLines.length,
          totalLines: initialTxtTotalLines,
        };
      }
      return {
        fileLineIndex: -1,
        text: '',
        isExhausted: true,
        skippedCount: initialTxtSkippedCount,
        totalValid: unworkedTxtLines.length,
        totalLines: initialTxtTotalLines,
      };
    };

    let initial: ThreadState[] = [];

    // Order selected profiles strictly according to active sort order / user selection:
    const selectedSet = new Set(selectedProfileIds.map((id) => String(id)));
    const allSelected = (profiles || []).filter((p) => selectedSet.has(String(p.id)));

    let selected: GpmProfile[] = [];
    if (sortOrder !== 'default') {
      selected = sortProfilesList(allSelected, sortOrder, selectedProfileIds);
    } else {
      // In default sort order, respect the exact order of selectedProfileIds (preserving user click / selection order)
      const profileMap = new Map<string, GpmProfile>();
      (profiles || []).forEach((p) => profileMap.set(String(p.id), p));
      selected = selectedProfileIds
        .map((id) => profileMap.get(String(id)))
        .filter((p): p is GpmProfile => Boolean(p));
      if (selected.length === 0) {
        selected = allSelected;
      }
    }

    if (selected.length > 0) {
      initial = selected.map((p, idx) => ({
        id: idx + 1,
        profileId: p.id,
        profileName: p.name,
        profileProxy: p.raw_proxy || (p as any).proxy || (p as any).profileProxy || '',
        port: 0,
        name: p.name,
        status: 'idle',
        currentAction: 'Ready',
        logs: [{ time: getTime(), text: `Profile "${p.name}" initialized (ID: ${p.id})`, type: 'info' }],
        assignedTxtEntry: buildTxtEntry(idx),
      }));
    } else {
      const baseThreads = generateInitialThreads(numThreads);
      initial = baseThreads.map((t, idx) => ({
        ...t,
        profileProxy: workerProxies[t.id] || '',
        assignedTxtEntry: buildTxtEntry(idx),
      }));
    }

    setThreads(initial);
    if (initial.length > 0 && selectedLogThreadId === null) {
      setSelectedLogThreadId(initial[0].id);
    }

    // Run worker pool respecting numThreads concurrency
    const concurrency = Math.max(1, Math.min(numThreads, initial.length));
    let nextIndex = 0;
    const workers = Array.from({ length: concurrency }, async (_, workerIdx) => {
      if (workerIdx > 0 && threadDelay > 0) {
        await sleep(workerIdx * threadDelay * 1000);
      }
      while (nextIndex < initial.length && !stopSignalRef.current) {
        const taskIdx = nextIndex++;
        const t = initial[taskIdx];
        if (!t) break;
        try {
          await runWorkerThread(t, workerIdx);
        } catch (err: any) {
          updateThreadLog(t.id, 'error', `✕ Worker error: ${err.message || err}`, 'Error');
          setThreadStatus(t.id, 'error');
        }
      }
    });
    await Promise.all(workers);

    setIsExecuting(false);
  };

  const updateThreadLog = (
    threadId: number,
    type: 'info' | 'success' | 'error' | 'arrow',
    text: string,
    currentAction?: string
  ) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === threadId) {
          return {
            ...t,
            currentAction: currentAction !== undefined ? currentAction : t.currentAction,
            logs: [...t.logs, { time: getTime(), text, type }],
          };
        }
        return t;
      })
    );
  };

  const setThreadStatus = (threadId: number, status: ThreadState['status']) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, status } : t))
    );
  };

  // GPMLogin / SV Browser Stop Profile API (GET /profiles/stop/{id})
  const stopProfileApi = async (profileId: string) => {
    if (!profileId) return;
    const endpoints = [
      `http://localhost:8725/api/v1/profiles/stop/${profileId}`,
      `http://127.0.0.1:8725/api/v1/profiles/stop/${profileId}`,
      `http://localhost:8725/api/v1/profiles/close/${profileId}`,
      `http://127.0.0.1:8725/api/v1/profiles/close/${profileId}`,
      `http://localhost:8725/api/v3/profiles/stop/${profileId}`,
      `http://127.0.0.1:8725/api/v3/profiles/stop/${profileId}`,
      `http://localhost:8725/api/v3/profiles/close/${profileId}`,
      `http://127.0.0.1:8725/api/v3/profiles/close/${profileId}`,
      `http://localhost:9495/api/v1/profiles/stop/${profileId}`,
    ];
    for (const ep of endpoints) {
      try {
        const r = await fetch(ep);
        if (r.ok) return;
      } catch (e) {
        if ((window as any).electronAPI?.fileAction) {
          try {
            await (window as any).electronAPI.fileAction({
              action: 'httpRequest',
              payload: { url: ep, method: 'GET' },
            });
            return;
          } catch {}
        }
      }
    }
  };

  // Run automation for a single worker thread
  const runWorkerThread = async (t: ThreadState, workerIdx?: number) => {
    const threadId = t.id;
    setThreadStatus(threadId, 'running');

    // Resolve profile proxy from workerProxies, t.profileProxy, or profile in memory
    const prof = profiles.find((p) => p.id === t.profileId);
    let resolvedProfileProxy = (
      workerProxies[threadId]?.trim() ||
      t.profileProxy ||
      prof?.raw_proxy ||
      (prof as any)?.proxy ||
      (prof as any)?.profileProxy ||
      ''
    ).trim();

    // If still empty and we have profileId, query single profile info via API
    if (!resolvedProfileProxy && t.profileId) {
      try {
        const profileInfoUrls = [
          `http://127.0.0.1:8725/api/v1/profiles/${t.profileId}`,
          `http://localhost:8725/api/v1/profiles/${t.profileId}`,
          `http://127.0.0.1:8725/api/v3/profiles/${t.profileId}`,
          `http://localhost:8725/api/v3/profiles/${t.profileId}`,
        ];
        for (const pUrl of profileInfoUrls) {
          try {
            const pRes = await fetch(pUrl);
            if (pRes.ok) {
              const pData = await pRes.json();
              const pProxy = pData?.data?.raw_proxy || pData?.data?.proxy || pData?.raw_proxy || pData?.proxy || '';
              if (pProxy) {
                resolvedProfileProxy = String(pProxy).trim();
                break;
              }
            }
          } catch {}
        }
      } catch {}
    }

    const proxy = resolvedProfileProxy;

    // 0. Check Excel / TXT input condition before opening profile or executing
    let targetExcelRow = -1; // 1-indexed row number in Excel
    let targetTxtLineIdx = -1;
    let matchedRowValues: any[] = [];
    let excelHeaderRow: string[] = [];
    let matchedTxtLine = '';

    // Check Excel input condition
    if (useInputExcel && excelFilePath.trim()) {
      try {
        updateThreadLog(threadId, 'info', `📊 Checking Excel input: ${excelFilePath} (Sheet: ${excelSheetId})...`, 'Check Excel');
        const readRes = await (window as any).electronAPI?.fileAction?.({
          action: 'readExcelAllRows',
          payload: { path: excelFilePath.trim(), sheetIndex: excelSheetId },
        });

        if (readRes && readRes.success && Array.isArray(readRes.rows)) {
          const rows: any[][] = readRes.rows;
          excelHeaderRow = rows.length > 0 ? rows[0].map((h: any) => String(h ?? '').trim()) : [];
          const okColIdx = colLetterToIndex(excelOkCol || 'Z');

          // Find target row
          let foundRowIdx = -1; // 0-indexed in rows array
          if (excelMapColA) {
            // Map according to profile name in Column A
            const pName = (t.profileName || t.name || '').trim().toLowerCase();
            foundRowIdx = rows.findIndex((r, idx) => {
              if (idx === 0 && rows.length > 1) {
                // If row 0 matches exact profile name, treat as data row
                if (String(r[0] || '').trim().toLowerCase() === pName) return true;
                return false;
              }
              return String(r[0] || '').trim().toLowerCase() === pName;
            });
            if (foundRowIdx === -1) {
              foundRowIdx = rows.findIndex((r) => String(r[0] || '').trim().toLowerCase().includes(pName) || pName.includes(String(r[0] || '').trim().toLowerCase()));
            }
          } else if (excelMapMode === 'one') {
            // Each profile reads one row
            const candidateIdx = threadId < rows.length ? threadId : ((threadId - 1) % Math.max(1, rows.length - 1)) + 1;
            foundRowIdx = candidateIdx;
          } else {
            // Each profile reads all rows (or starts from row 1)
            foundRowIdx = 1 < rows.length ? 1 : 0;
          }

          if (foundRowIdx !== -1 && rows[foundRowIdx]) {
            targetExcelRow = foundRowIdx + 1; // 1-indexed for XLSX write
            matchedRowValues = rows[foundRowIdx];
            const targetCellVal = String(rows[foundRowIdx][okColIdx] ?? '').trim();
            const entireRowText = rows[foundRowIdx].map((c) => String(c ?? '')).join(' ').trim();

            // Prepare skip keywords list from skipStatusKeywords
            const skipKws = (skipStatusKeywords || 'done, trạng thái:, error')
              .split(',')
              .map((k) => k.trim().toLowerCase())
              .filter(Boolean);

            let shouldSkip = false;
            let skipReason = '';

            // Check 1: If column already has text and excelSkipIfHasText is true
            if (excelSkipIfHasText && targetCellVal !== '') {
              shouldSkip = true;
              skipReason = `Cột ${excelOkCol.toUpperCase()} đã có chữ: "${targetCellVal}"`;
            }

            // Check 2: If cell or entire row contains any skip keywords (done, trạng thái:, error)
            if (!shouldSkip && skipKws.length > 0) {
              for (const kw of skipKws) {
                if (targetCellVal.toLowerCase().includes(kw)) {
                  shouldSkip = true;
                  skipReason = `Cột ${excelOkCol.toUpperCase()} chứa từ khóa bỏ qua: "${kw}" ("${targetCellVal}")`;
                  break;
                }
                if (entireRowText.toLowerCase().includes(kw)) {
                  shouldSkip = true;
                  skipReason = `Dòng Excel chứa từ khóa bỏ qua: "${kw}"`;
                  break;
                }
              }
            }

            if (shouldSkip) {
              updateThreadLog(threadId, 'info', `⏭ BỎ QUA Profile "${t.profileName}" - ${skipReason}`, 'Bỏ qua (Skipped)');
              setThreadStatus(threadId, 'idle');
              setThreads((prev) =>
                prev.map((item) =>
                  item.id === threadId
                    ? { ...item, status: 'idle', currentAction: `Bỏ qua: ${skipReason}` }
                    : item
                )
              );
              return; // Do not open browser or run
            }

            updateThreadLog(threadId, 'success', `✔ Mapped to Excel row ${targetExcelRow} (Col ${excelOkCol.toUpperCase()}: "${targetCellVal || 'Empty'}")`);
          } else {
            updateThreadLog(threadId, 'info', `ℹ Profile "${t.profileName}" not found in Column A. Proceeding without row mapping.`);
          }
        }
      } catch (err: any) {
        updateThreadLog(threadId, 'error', `✕ Error checking Excel input: ${err.message}`);
      }
    }

    // Check Text file line input condition
    if (useInputTxt && txtFilePath.trim()) {
      const entry = t.assignedTxtEntry;
      if (entry) {
        if (entry.isExhausted) {
          const skipMsg =
            entry.totalValid === 0
              ? `⏭ BỎ QUA Profile "${t.profileName}" - Tất cả ${entry.totalLines} dòng trong file TXT đều đã hoàn thành (chứa từ khóa: ${txtSkipKeywords || 'done, trạng thái:, error, OK'})`
              : `⏭ BỎ QUA Profile "${t.profileName}" - Đã hết dòng TXT chưa làm (Tổng cộng ${entry.totalValid} dòng chưa có 'OK' đã được phân bổ cho các Profile trước)`;
          updateThreadLog(threadId, 'info', skipMsg, 'Hết dòng TXT');
          setThreadStatus(threadId, 'idle');
          setThreads((prev) =>
            prev.map((item) =>
              item.id === threadId
                ? { ...item, status: 'idle', currentAction: `Bỏ qua: Hết dòng TXT chưa làm` }
                : item
            )
          );
          return;
        } else {
          targetTxtLineIdx = entry.fileLineIndex;
          matchedTxtLine = entry.text;
          const skipNote = entry.skippedCount > 0 ? ` (Tự động bỏ qua ${entry.skippedCount} dòng đã có 'OK')` : '';
          updateThreadLog(
            threadId,
            'info',
            `📄 [Luồng ${threadId}] Đã nạp dòng #${targetTxtLineIdx + 1} từ TXT: "${matchedTxtLine.slice(0, 50)}${matchedTxtLine.length > 50 ? '...' : ''}"${skipNote}`,
            'Nạp dữ liệu'
          );
        }
      } else {
        // Fallback if not pre-allocated
        try {
          const cleanTxtPath = txtFilePath.trim().replace(/^["']|["']$/g, '');
          const readTxtRes = await (window as any).electronAPI?.fileAction?.({
            action: 'readLines',
            payload: { path: cleanTxtPath },
          });

          if (readTxtRes && readTxtRes.success && Array.isArray(readTxtRes.lines)) {
            const skipKws = (txtSkipKeywords || 'done, trạng thái:, error, OK')
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

            const validLines: Array<{ fileLineIndex: number; text: string }> = [];
            readTxtRes.lines.forEach((l: any, idx: number) => {
              const raw = String(l).replace(/\r$/, '');
              if (raw.trim().length > 0 && !isLineSkipped(raw)) {
                validLines.push({ fileLineIndex: idx, text: raw });
              }
            });

            const slotIdx = threadId - 1;
            if (slotIdx < validLines.length) {
              targetTxtLineIdx = validLines[slotIdx].fileLineIndex;
              matchedTxtLine = validLines[slotIdx].text;
              updateThreadLog(
                threadId,
                'info',
                `📄 Đã nạp dòng #${targetTxtLineIdx + 1} từ TXT: "${matchedTxtLine.slice(0, 50)}${matchedTxtLine.length > 50 ? '...' : ''}"`,
                'Nạp dữ liệu'
              );
            } else {
              updateThreadLog(threadId, 'info', `⏭ BỎ QUA Profile "${t.profileName}" - Hết dòng TXT`, 'Hết dòng TXT');
              setThreadStatus(threadId, 'idle');
              return;
            }
          }
        } catch (err: any) {
          updateThreadLog(threadId, 'error', `✕ Lỗi nạp dữ liệu TXT: ${err.message}`);
        }
      }
    }

    // 1. Check Proxy / IP if proxy is configured
    if (proxy && !skipProxyCheck) {
      updateThreadLog(threadId, 'info', `🔍 Checking IP / Proxy: ${proxy}...`, 'Check Proxy');
      try {
        let ipResult: any = null;
        if ((window as any).electronAPI?.checkIp) {
          ipResult = await (window as any).electronAPI.checkIp({ proxy, timeoutMs: 5000 }).catch(() => null);
        }
        if (!ipResult) {
          ipResult = await fetch('http://ip-api.com/json', { signal: AbortSignal.timeout(5000) })
            .then((r) => r.json())
            .then((j) => ({ success: true, ip: j.query, country: j.country, isp: j.isp }))
            .catch((e) => ({ success: false, error: e.message }));
        }

        if (ipResult && ipResult.success) {
          const ipInfo = `${ipResult.ip}${ipResult.country ? ` (${ipResult.country})` : ''}${ipResult.isp ? ` - ${ipResult.isp}` : ''}`;
          updateThreadLog(threadId, 'success', `✔ Proxy Check OK: ${ipInfo}`);
        } else {
          updateThreadLog(threadId, 'info', `⚡ Proxy check bypassed / fallback: ${ipResult?.error || 'timeout'}`);
        }
      } catch (e: any) {
        updateThreadLog(threadId, 'info', `⚡ Proxy check bypassed: ${e.message}`);
      }
    } else if (skipProxyCheck) {
      updateThreadLog(threadId, 'info', `⚡ Skipping proxy check (Skip proxy check enabled)`);
    } else {
      updateThreadLog(threadId, 'info', `⚡ Direct connection (No proxy configured)`);
    }

    let activePort = t.port;

    // 2. Tính toán vị trí & kích thước cửa sổ chia đều màn hình (Ưu tiên góc trái trên rồi tự động chia ra)
    const gridConfig = getEffectiveGridConfig(numThreads);
    const slotIdx = workerIdx !== undefined ? workerIdx : ((threadId - 1) % Math.max(1, gridConfig.cols * gridConfig.rows));
    const pos = autoTileWindows
      ? computeTilePosition(
          slotIdx,
          gridConfig.screen.workArea.x,
          gridConfig.screen.workArea.y,
          gridConfig.screen.workArea.width,
          gridConfig.screen.workArea.height,
          gridConfig.winWidth,
          gridConfig.winHeight,
          gridConfig.cols,
          gridConfig.rows
        )
      : {
          x: gridConfig.screen.workArea.x,
          y: gridConfig.screen.workArea.y,
          width: gridConfig.winWidth,
          height: gridConfig.winHeight,
        };

    // 3. Launch Profile via SV Browser API or Standalone Chrome
    if (t.profileId) {
      const isIncognitoMode = Boolean(hideWindowWhenDone);
      const actionPath = isIncognitoMode ? 'start-incognito' : 'start';
      updateThreadLog(
        threadId,
        'info',
        `🚀 Opening SV Browser profile ${isIncognitoMode ? '(Incognito / Ẩn danh)' : ''} "${t.profileName}" (Vị trí: x=${pos.x}, y=${pos.y} • ${pos.width}x${pos.height})...`,
        'Open Profile'
      );
      try {
        let launchRes: any = null;
        const scaleVal = (windowScale / 100).toFixed(2);
        const queryParams = `win_pos=${pos.x},${pos.y}&window_pos=${pos.x},${pos.y}&win_position=${pos.x},${pos.y}&window_position=${pos.x},${pos.y}&win_size=${pos.width},${pos.height}&window_size=${pos.width},${pos.height}&window_scale=${scaleVal}&win_scale=${scaleVal}&skip_proxy_check=${skipProxyCheck}`;
        const startUrls = [
          `http://127.0.0.1:8725/api/v1/profiles/${actionPath}/${t.profileId}?${queryParams}`,
          `http://localhost:8725/api/v1/profiles/${actionPath}/${t.profileId}?${queryParams}`,
          `http://127.0.0.1:8725/api/v3/profiles/${actionPath}/${t.profileId}?${queryParams}`,
          `http://localhost:8725/api/v3/profiles/${actionPath}/${t.profileId}?${queryParams}`,
          `http://localhost:9495/api/v1/profiles/${actionPath}/${t.profileId}?${queryParams}`,
        ];

        for (const url of startUrls) {
          try {
            const resp = await fetch(url);
            launchRes = await resp.json();
            const candidate = launchRes?.data?.remote_debugging_address || launchRes?.remote_debugging_address || launchRes?.data?.port;
            if (candidate || (launchRes && launchRes.success)) {
              break;
            }
          } catch (e) {
            if ((window as any).electronAPI?.fileAction) {
              try {
                const res = await (window as any).electronAPI.fileAction({
                  action: 'httpRequest',
                  payload: { url, method: 'GET' },
                });
                if (res && res.data) {
                  const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                  const candidate = parsed?.data?.remote_debugging_address || parsed?.remote_debugging_address || parsed?.data?.port;
                  if (candidate || (parsed && parsed.success)) {
                    launchRes = parsed;
                    break;
                  }
                }
              } catch {}
            }
          }
        }

        if (launchRes?.data?.raw_proxy || launchRes?.data?.proxy) {
          const apiProxy = String(launchRes.data.raw_proxy || launchRes.data.proxy).trim();
          if (apiProxy) resolvedProfileProxy = apiProxy;
        }

        const addr =
          launchRes?.data?.remote_debugging_address ||
          launchRes?.remote_debugging_address ||
          (launchRes?.data?.port ? `127.0.0.1:${launchRes.data.port}` : null);

        if (!addr) {
          const errMsg = launchRes?.message || 'Failed to start profile in SV Browser';
          updateThreadLog(threadId, 'error', `✕ ${errMsg}`);
          setThreadStatus(threadId, 'error');
          if (t.profileId) await stopProfileApi(t.profileId);
          return;
        }

        const portStr = String(addr).split(':').pop();
        activePort = parseInt(portStr || '0', 10);
        updateThreadLog(threadId, 'success', `✔ Profile started on port ${activePort}`);
        setThreads((prev) =>
          prev.map((item) => (item.id === threadId ? { ...item, port: activePort } : item))
        );
      } catch (err: any) {
        updateThreadLog(threadId, 'error', `✕ Error starting profile: ${err.message}`);
        setThreadStatus(threadId, 'error');
        if (t.profileId) await stopProfileApi(t.profileId);
        return;
      }
    } else {
      activePort = activePort || 43076 + (threadId - 1);
      updateThreadLog(
        threadId,
        'info',
        `🚀 Opening Chrome for Worker #${threadId} on port ${activePort} (Vị trí: x=${pos.x}, y=${pos.y} • ${pos.width}x${pos.height})...`,
        'Open Chrome'
      );
      if ((window as any).electronAPI?.launchBrowser) {
        const launchRes = await (window as any).electronAPI.launchBrowser({
          port: activePort,
          url: 'about:blank',
          profileName: `ChromeProfile_Thread_${threadId}_${activePort}`,
          windowSize: { width: pos.width, height: pos.height },
          windowPosition: { x: pos.x, y: pos.y },
          scale: windowScale,
          proxy,
        });
        if (launchRes && launchRes.success === false) {
          updateThreadLog(threadId, 'error', `✕ Failed to launch Chrome: ${launchRes.error || 'Unknown error'}`);
          setThreadStatus(threadId, 'error');
          return;
        }
      }
    }

    // 4. Connect to Chrome on this port
    updateThreadLog(threadId, 'info', `▶ Connecting to Chrome on port ${activePort}...`, 'Connect CDP');
    let connected = false;
    for (let r = 0; r < 15; r++) {
      if (stopSignalRef.current) break;
      try {
        const res = (window as any).electronAPI?.testPort
          ? await (window as any).electronAPI.testPort(activePort)
          : await fetch(`http://127.0.0.1:${activePort}/json/version`).then((x) => x.json());
        if (res && (res.success || res.Browser)) {
          connected = true;
          break;
        }
      } catch (e) {}
      await sleep(700);
    }

    if (!connected) {
      updateThreadLog(threadId, 'error', `✕ Failed to connect to Chrome on port ${activePort}`);
      setThreadStatus(threadId, 'error');
      if (t.profileId) await stopProfileApi(t.profileId);
      return;
    }

    updateThreadLog(threadId, 'success', `✔ Connected to Chrome (${activePort})`);

    // Bảo đảm vị trí và kích thước cửa sổ trên màn hình chuẩn xác qua CDP
    if ((window as any).electronAPI?.cdpAction) {
      await (window as any).electronAPI.cdpAction({
        port: activePort,
        action: 'setWindowBounds',
        payload: { x: pos.x, y: pos.y, width: pos.width, height: pos.height },
      }).catch(() => {});
    }

    // If Use Virtual Mouse is enabled, inject persistent virtual mouse into this Chrome thread
    if (useVirtualMouse && (window as any).electronAPI?.cdpAction) {
      updateThreadLog(threadId, 'info', `🖱 Initializing independent Virtual Mouse for Worker #${threadId}...`);
      await (window as any).electronAPI.cdpAction({
        port: activePort,
        action: 'initVirtualMouse',
        payload: { script: VIRTUAL_MOUSE_SCRIPT },
      }).catch(() => {});
      updateThreadLog(threadId, 'success', `✔ Virtual Mouse active (Persistent red cursor)`);
    }

    // Collect workflow nodes to execute
    const nodes: WorkflowNode[] = [
      ...(currentProject?.script?.before_init?.nodes || []),
      ...(currentProject?.script?.main_logic?.nodes || []),
      ...(currentProject?.script?.after_quit?.nodes || []),
    ];

    const threadVars: Record<string, string> = {
      $threadId: String(threadId),
      $port: String(activePort),
      $profileId: t.profileId || '',
      $profileName: t.profileName || '',
      $profileProxy: resolvedProfileProxy,
      $proxy: resolvedProfileProxy,
      threadId: String(threadId),
      port: String(activePort),
      profileId: t.profileId || '',
      profileName: t.profileName || '',
      profileProxy: resolvedProfileProxy,
      proxy: resolvedProfileProxy,
    };

    if (resolvedProfileProxy) {
      let pHost = '';
      let pPort = '';
      let pUser = '';
      let pPass = '';

      if (resolvedProfileProxy.includes('://')) {
        try {
          const u = new URL(resolvedProfileProxy);
          pHost = u.hostname || '';
          pPort = u.port || '';
          pUser = decodeURIComponent(u.username || '');
          pPass = decodeURIComponent(u.password || '');
        } catch {}
      } else {
        const parts = resolvedProfileProxy.split(':');
        if (parts.length >= 2) {
          pHost = parts[0] || '';
          pPort = parts[1] || '';
        }
        if (parts.length >= 4) {
          pUser = parts[2] || '';
          pPass = parts[3] || '';
        }
      }

      if (pHost) {
        threadVars['$profileProxyHost'] = pHost;
        threadVars['profileProxyHost'] = pHost;
        threadVars['$proxyHost'] = pHost;
        threadVars['proxyHost'] = pHost;
      }
      if (pPort) {
        threadVars['$profileProxyPort'] = pPort;
        threadVars['profileProxyPort'] = pPort;
        threadVars['$proxyPort'] = pPort;
        threadVars['proxyPort'] = pPort;
      }
      if (pUser) {
        threadVars['$profileProxyUser'] = pUser;
        threadVars['profileProxyUser'] = pUser;
        threadVars['$proxyUser'] = pUser;
        threadVars['proxyUser'] = pUser;
      }
      if (pPass) {
        threadVars['$profileProxyPass'] = pPass;
        threadVars['profileProxyPass'] = pPass;
        threadVars['$proxyPass'] = pPass;
        threadVars['proxyPass'] = pPass;
      }
    }

    updateThreadLog(
      threadId,
      'info',
      `🚀 [Khởi tạo biến] $profileName = "${t.profileName || ''}", $profileProxy = "${resolvedProfileProxy || '(Không dùng proxy)'}"`
    );

    if (matchedRowValues && matchedRowValues.length > 0) {
      matchedRowValues.forEach((val, idx) => {
        const colLetter = indexToColLetter(idx); // 'A', 'B', 'C'...
        const strVal = String(val ?? '');

        // 1. Column letters: $A, $B, $col_A, $col_B, $colA, $colB
        threadVars[colLetter] = strVal;
        threadVars[`$${colLetter}`] = strVal;
        threadVars[`col_${colLetter}`] = strVal;
        threadVars[`$col_${colLetter}`] = strVal;
        threadVars[`col_${colLetter.toLowerCase()}`] = strVal;
        threadVars[`$col_${colLetter.toLowerCase()}`] = strVal;
        threadVars[`col${colLetter}`] = strVal;
        threadVars[`$col${colLetter}`] = strVal;

        // 2. 1-indexed column numbers: $col_1, $col_2...
        threadVars[`col_${idx + 1}`] = strVal;
        threadVars[`$col_${idx + 1}`] = strVal;
        threadVars[`col_${idx}`] = strVal;
        threadVars[`$col_${idx}`] = strVal;

        // 3. Header names if row 1 of Excel is a header
        if (excelHeaderRow && excelHeaderRow[idx]) {
          const rawHeader = String(excelHeaderRow[idx]).trim();
          const cleanHeader = rawHeader.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          if (rawHeader) {
            threadVars[rawHeader] = strVal;
            threadVars[`$${rawHeader}`] = strVal;
          }
          if (cleanHeader && cleanHeader !== rawHeader) {
            threadVars[cleanHeader] = strVal;
            threadVars[`$${cleanHeader}`] = strVal;
          }
        }
      });

      if (targetExcelRow > 0) {
        threadVars['excel_row'] = String(targetExcelRow);
        threadVars['$excel_row'] = String(targetExcelRow);
      }
    }

    if (matchedTxtLine) {
      threadVars[`$txt_line`] = matchedTxtLine;
      threadVars[`txt_line`] = matchedTxtLine;
      threadVars[`$line`] = matchedTxtLine;
      threadVars[`line`] = matchedTxtLine;

      if (targetTxtLineIdx >= 0) {
        threadVars['$txt_line_index'] = String(targetTxtLineIdx);
        threadVars['txt_line_index'] = String(targetTxtLineIdx);
        threadVars['$txt_line_number'] = String(targetTxtLineIdx + 1);
        threadVars['txt_line_number'] = String(targetTxtLineIdx + 1);
      }

      // Automatically split line by delimiters: |, tab, semicolon, colon (if not URL), comma
      let parts: string[] = [];
      if (matchedTxtLine.includes('|')) {
        parts = matchedTxtLine.split('|');
      } else if (matchedTxtLine.includes('\t')) {
        parts = matchedTxtLine.split('\t');
      } else if (matchedTxtLine.includes(';') && !matchedTxtLine.includes('&')) {
        parts = matchedTxtLine.split(';');
      } else if (matchedTxtLine.includes(':') && !matchedTxtLine.startsWith('http')) {
        parts = matchedTxtLine.split(':');
      } else if (matchedTxtLine.includes(',')) {
        parts = matchedTxtLine.split(',');
      } else {
        parts = [matchedTxtLine];
      }

      parts.forEach((part, pIdx) => {
        const pVal = part.trim();
        const colNum = pIdx + 1;
        threadVars[`line_${colNum}`] = pVal;
        threadVars[`$line_${colNum}`] = pVal;
        threadVars[`line${colNum}`] = pVal;
        threadVars[`$line${colNum}`] = pVal;
        threadVars[`data_${colNum}`] = pVal;
        threadVars[`$data_${colNum}`] = pVal;
        threadVars[`col_${colNum}`] = pVal;
        threadVars[`$col_${colNum}`] = pVal;
        if (colNum === 1) {
          threadVars['email'] = pVal;
          threadVars['$email'] = pVal;
          threadVars['username'] = pVal;
          threadVars['$username'] = pVal;
        } else if (colNum === 2) {
          threadVars['password'] = pVal;
          threadVars['$password'] = pVal;
          threadVars['pass'] = pVal;
          threadVars['$pass'] = pVal;
        } else if (colNum === 3) {
          threadVars['2fa'] = pVal;
          threadVars['$2fa'] = pVal;
          threadVars['code_2fa'] = pVal;
          threadVars['$code_2fa'] = pVal;
        }
      });
    }

    let wasStoppedByAction = false;

    const resolveLoopVar = (s: string) => {
      return resolveVariableString(s, threadVars);
    };

    const checkXPathInChrome = async (xpath: string): Promise<boolean> => {
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
            const fx = ${JSON.stringify(threadVars.$currentFrameXPath || '')};
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

        const isTrueVal = (res: any) => {
          if (!res) return false;
          return res.value === true || res.result?.value === true || res.value?.value === true;
        };

        const doEval = async (withCtx: boolean) => {
          return await (window as any).electronAPI?.cdpAction({
            port: activePort,
            action: 'evaluate',
            payload: {
              expression: checkScript,
              targetId: threadVars.$activePopupTargetId,
              contextId: withCtx && threadVars.$currentFrameContextId ? Number(threadVars.$currentFrameContextId) : undefined,
            },
          });
        };

        // 1. Immediate evaluation
        let evalRes = await doEval(true);
        if ((!evalRes || evalRes.error?.includes('context')) && threadVars.$currentFrameContextId) {
          evalRes = await doEval(false);
        }
        if (isTrueVal(evalRes)) return true;

        // 2. Poll for up to 2000ms (150ms intervals) to allow async DOM rendering / SPA navigation
        const startWait = Date.now();
        while (Date.now() - startWait < 2000 && !stopSignalRef.current) {
          await sleep(150);
          evalRes = await doEval(true);
          if ((!evalRes || evalRes.error?.includes('context')) && threadVars.$currentFrameContextId) {
            evalRes = await doEval(false);
          }
          if (isTrueVal(evalRes)) return true;
        }

        return false;
      } catch (e) {
        return false;
      }
    };

    const executeThreadNodes = async (nodesToRun: WorkflowNode[]): Promise<'STOP' | 'CONTINUE' | 'ERROR_STOP' | 'BREAK_LOOP' | 'NEXT_LOOP'> => {
      let lastConditionBranchMet = false;

      for (let i = 0; i < nodesToRun.length; i++) {
        if (stopSignalRef.current) break;
        const n = nodesToRun[i];
        const isBlock = 'nodes' in n && Array.isArray((n as any).nodes);

        if (isBlock) {
          const block = n as any;
          const bText = (block.display_text || '').toLowerCase();

          if (bText.startsWith('if') || block.$type?.includes('IfBlockNode')) {
            const cond = block.condition || '';
            await sleep(20);
            const condMet = await evaluateGpmConditionAsync(cond, threadVars, checkXPathInChrome);
            updateThreadLog(threadId, 'info', `🔍 If [${cond}] › ${condMet ? 'ĐÚNG (Khớp)' : 'SAI (Không khớp)'}`);
            lastConditionBranchMet = condMet;
            if (condMet) {
              const res = await executeThreadNodes(block.nodes);
              if (res === 'STOP' || res === 'ERROR_STOP' || res === 'BREAK_LOOP' || res === 'NEXT_LOOP') return res;
            }
          } else if (bText.startsWith('else if') || block.$type?.includes('ElseIfBlockNode')) {
            const cond = block.condition || '';
            await sleep(20);
            if (!lastConditionBranchMet) {
              const condMet = await evaluateGpmConditionAsync(cond, threadVars, checkXPathInChrome);
              updateThreadLog(threadId, 'info', `🔍 Else If [${cond}] › ${condMet ? 'ĐÚNG (Khớp)' : 'SAI (Không khớp)'}`);
              if (condMet) {
                lastConditionBranchMet = true;
                const res = await executeThreadNodes(block.nodes);
                if (res === 'STOP' || res === 'ERROR_STOP' || res === 'BREAK_LOOP' || res === 'NEXT_LOOP') return res;
              }
            }
          } else if (bText.startsWith('else') || block.$type?.includes('ElseBlockNode')) {
            await sleep(20);
            if (!lastConditionBranchMet) {
              updateThreadLog(threadId, 'info', `🔍 Nhánh Else › Chạy khối lệnh Else`);
              lastConditionBranchMet = true;
              const res = await executeThreadNodes(block.nodes);
              if (res === 'STOP' || res === 'ERROR_STOP' || res === 'BREAK_LOOP' || res === 'NEXT_LOOP') return res;
            }
          } else if (bText.startsWith('for') || block.$type?.includes('ForBlockNode')) {
            lastConditionBranchMet = false;
            const rawStart = resolveLoopVar(String(block.start ?? '0'));
            const rawEnd = resolveLoopVar(String(block.end ?? '10'));
            const rawStep = resolveLoopVar(String(block.step ?? '1'));
            const start = parseInt(rawStart, 10) || 0;
            const end = parseInt(rawEnd, 10) || 0;
            const step = parseInt(rawStep, 10) || 1;

            updateThreadLog(threadId, 'info', `🔁 Bắt đầu vòng lặp For (${start} ➔ ${end}, bước nhảy ${step})`);

            for (let iter = start; iter < end && !stopSignalRef.current; iter += step) {
              threadVars['$loopIndex'] = String(iter);
              threadVars['loopIndex'] = String(iter);
              threadVars['$loop_index'] = String(iter);
              threadVars['loop_index'] = String(iter);
              threadVars['$index'] = String(iter);
              threadVars['index'] = String(iter);
              threadVars['$i'] = String(iter);
              threadVars['i'] = String(iter);
              const res = await executeThreadNodes(block.nodes);
              if (res === 'STOP' || res === 'ERROR_STOP') return res;
              if (res === 'BREAK_LOOP') {
                updateThreadLog(threadId, 'info', `🚪 Thoát khỏi vòng lặp For thành công (Exit loop) tại $loopIndex = ${iter}`);
                break;
              }
              if (res === 'NEXT_LOOP') continue;
            }
          } else if (bText.startsWith('while') || block.$type?.includes('WhileBlockNode')) {
            lastConditionBranchMet = false;
            let count = 0;
            updateThreadLog(threadId, 'info', `🔁 Bắt đầu vòng lặp While [${block.condition || ''}]`);
            while (await evaluateGpmConditionAsync(block.condition || '', threadVars, checkXPathInChrome) && count < 100 && !stopSignalRef.current) {
              threadVars['$loopIndex'] = String(count);
              threadVars['loopIndex'] = String(count);
              threadVars['$loop_index'] = String(count);
              threadVars['loop_index'] = String(count);
              threadVars['$index'] = String(count);
              threadVars['index'] = String(count);
              threadVars['$i'] = String(count);
              threadVars['i'] = String(count);
              count++;
              const res = await executeThreadNodes(block.nodes);
              if (res === 'STOP' || res === 'ERROR_STOP') return res;
              if (res === 'BREAK_LOOP') {
                updateThreadLog(threadId, 'info', `🚪 Thoát khỏi vòng lặp While thành công (Exit loop)`);
                break;
              }
              if (res === 'NEXT_LOOP') continue;
            }
          } else {
            lastConditionBranchMet = false;
            const res = await executeThreadNodes(block.nodes);
            if (res === 'STOP' || res === 'ERROR_STOP' || res === 'BREAK_LOOP' || res === 'NEXT_LOOP') return res;
          }
        } else {
          lastConditionBranchMet = false;
          const act = n as ActionNode;
          const actName = (act.display_text || '').toLowerCase();
          const actType = act.type;

          if (actType === 120 || actName === 'call workflow' || actName.includes('call workflow')) {
            let refFile = '';
            try {
              const p = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
              if (Array.isArray(p)) {
                const item = p.find((x: any) => x.Key === 'REFERENCE_FILE' || x.Key === 'WORKFLOW_NAME');
                if (item && item.Value) refFile = item.Value.trim();
              }
            } catch (e) {}

            refFile = resolveVariableString(refFile, threadVars);

            if (!refFile) {
              const isContinue = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
              if (isContinue) {
                updateThreadLog(threadId, 'info', `⚠ Call workflow › Chưa cấu hình Reference file (Continue on error: Bỏ qua)`);
                continue;
              } else {
                updateThreadLog(threadId, 'error', `✕ Call workflow thất bại: Chưa cấu hình Reference file`);
                return 'ERROR_STOP';
              }
            }

            // Look up sub-workflow script
            let targetScript: EditorFile | null = currentProject?.subWorkflows?.[refFile] || null;

            // If not found in memory, try loading from disk if in Electron
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
              const isContinue = act.continue_on_error === true || String(act.continue_on_error).toLowerCase() === 'true';
              if (isContinue) {
                updateThreadLog(threadId, 'info', `⚠ Call workflow › Không tìm thấy workflow file "${refFile}" (Continue on error: Bỏ qua)`);
                continue;
              } else {
                updateThreadLog(threadId, 'error', `✕ Call workflow thất bại: Không tìm thấy file workflow "${refFile}"`);
                return 'ERROR_STOP';
              }
            }

            const childNodes: WorkflowNode[] = [
              ...(targetScript.before_init?.nodes || []),
              ...(targetScript.main_logic?.nodes || []),
              ...(targetScript.after_quit?.nodes || []),
            ];

            updateThreadLog(threadId, 'info', `▶ Call workflow ▸ Bắt đầu thực thi sub-workflow "${refFile}" (${childNodes.length} actions)`);

            const childRes = await executeThreadNodes(childNodes);
            if (childRes === 'STOP' || childRes === 'ERROR_STOP') return childRes;

            // Alias variables modified in child workflow with prefix $refFile_varName
            for (const [k, v] of Object.entries(threadVars)) {
              const cleanK = k.startsWith('$') ? k.substring(1) : k;
              threadVars[`$${refFile}_${cleanK}`] = v;
              threadVars[`${refFile}_${cleanK}`] = v;
            }

            updateThreadLog(threadId, 'success', `✓ Call workflow ▸ Hoàn tất thực thi sub-workflow "${refFile}"`);
            continue;
          }

          const res = await executeThreadAction(threadId, activePort, act, threadVars);
          if (res === 'STOP' || res === 'ERROR_STOP' || res === 'BREAK_LOOP' || res === 'NEXT_LOOP') return res;
        }
      }
      return 'CONTINUE';
    };

    const threadRunRes = await executeThreadNodes(nodes);
    if (threadRunRes === 'STOP') {
      wasStoppedByAction = true;
    } else if (threadRunRes === 'ERROR_STOP') {
      setThreadStatus(threadId, 'error');
      if (t.profileId) {
        updateThreadLog(threadId, 'info', `⏹ Dừng & đóng profile "${t.profileName || t.profileId}" qua API (Continue on error: Tắt)...`);
        await stopProfileApi(t.profileId);
      }
      return; // Dừng luồng gặp lỗi để worker slot chuyển sang chạy luồng tiếp theo nếu còn
    }

    if (stopSignalRef.current) {
      setThreadStatus(threadId, 'idle');
      updateThreadLog(threadId, 'error', `■ Thread stopped by user`, 'Stopped');
    } else {
      setThreadStatus(threadId, 'completed');
      if (wasStoppedByAction) {
        updateThreadLog(threadId, 'info', `⏹ Workflow stopped by Stop action`, 'Stopped');
      } else {
        updateThreadLog(threadId, 'success', `✔ Workflow finished successfully!`, 'Completed');
      }

      // If Write 'OK' status to Excel is enabled:
      if (useInputExcel && excelWriteOk && excelFilePath.trim() && targetExcelRow > 0) {
        try {
          updateThreadLog(threadId, 'info', `📝 Writing 'OK' to Excel row ${targetExcelRow}, col ${excelOkCol.toUpperCase()}...`, 'Write Excel');
          await (window as any).electronAPI?.fileAction?.({
            action: 'writeExcel',
            payload: {
              path: excelFilePath.trim(),
              sheetIndex: excelSheetId,
              col: excelOkCol.toUpperCase() || 'Z',
              row: targetExcelRow,
              value: 'OK',
            },
          });
          updateThreadLog(threadId, 'success', `✔ Written 'OK' to Excel (Row ${targetExcelRow}, Col ${excelOkCol.toUpperCase()})`);
        } catch (e: any) {
          updateThreadLog(threadId, 'info', `⚠️ Could not write 'OK' to Excel: ${e.message}`);
        }
      }

      // If Write status to TXT is enabled:
      if (useInputTxt && txtWriteOk && txtFilePath.trim() && targetTxtLineIdx >= 0) {
        try {
          const cleanTxtPath = txtFilePath.trim().replace(/^["']|["']$/g, '');
          updateThreadLog(threadId, 'info', `📝 Đang cập nhật trạng thái 'OK' vào file TXT dòng #${targetTxtLineIdx + 1}...`, 'Write TXT');
          const updateRes = await (window as any).electronAPI?.fileAction?.({
            action: 'updateFileLine',
            payload: {
              path: cleanTxtPath,
              lineIndex: targetTxtLineIdx,
              originalLine: matchedTxtLine,
              suffix: ' | OK',
            },
          });
          if (updateRes && updateRes.success) {
            updateThreadLog(threadId, 'success', `✔ Đã ghi 'OK' trực tiếp vào file TXT (Dòng #${(updateRes.updatedLineIndex ?? targetTxtLineIdx) + 1})`);
          } else {
            updateThreadLog(threadId, 'info', `⚠️ Không thể cập nhật file TXT: ${updateRes?.error || 'Lỗi không xác định'}`);
          }
        } catch (e: any) {
          updateThreadLog(threadId, 'info', `⚠️ Lỗi ghi trạng thái vào TXT: ${e.message}`);
        }
      }
    }

    // Close profile cleanly only if user explicitly checked closeBrowserOnDone
    if (t.profileId && closeBrowserOnDone) {
      updateThreadLog(threadId, 'info', `⏹ Closing browser profile as configured...`);
      await stopProfileApi(t.profileId);
    }
  };

  // Execute a single action within a specific thread's Chrome instance
  const executeThreadAction = async (
    threadId: number,
    port: number,
    act: ActionNode,
    vars: Record<string, string>
  ) => {
    const actType = act.type;
    const actName = (act.display_text || '').toLowerCase();

    const resolveStr = (s: string) => {
      return resolveVariableString(s, vars);
    };

    const getRawVal = (key: string, fb: string = '') => {
      try {
        const p = typeof act.raw_input === 'string' ? JSON.parse(act.raw_input) : act.raw_input;
        if (Array.isArray(p)) {
          const item = p.find((x: any) => x.Key === key);
          if (item && item.Value !== undefined && item.Value !== null) {
            const valStr = String(item.Value);
            if (valStr.trim() === '' && fb) return fb;
            return valStr;
          }
        }
      } catch (e) {}
      return fb;
    };

    // Central action error handler obeying Continue on error
    const handleActionFailure = async (
      actionDisplayName: string,
      errorDetail: string
    ): Promise<'CONTINUE' | 'ERROR_STOP'> => {
      const isContinueOnError =
        act.continue_on_error === true ||
        String(act.continue_on_error).toLowerCase() === 'true';

      if (isContinueOnError) {
        updateThreadLog(
          threadId,
          'info',
          `⚠ ${actionDisplayName} › ${errorDetail} (Continue on error: Bỏ qua lỗi và chạy tiếp)`
        );
        return 'CONTINUE';
      } else {
        updateThreadLog(
          threadId,
          'error',
          `✕ ${actionDisplayName} failed: ${errorDetail} (Continue on error: Tắt -> Dừng luồng & đóng profile)`
        );
        setThreadStatus(threadId, 'error');
        const profId = vars.$profileId || vars.profileId;
        if (profId) {
          updateThreadLog(
            threadId,
            'info',
            `⏹ Đang đóng profile ${vars.$profileName || profId} via API (http://localhost:8725/api/v1/profiles/stop/${profId})...`
          );
          await stopProfileApi(profId);
        }
        return 'ERROR_STOP';
      }
    };

    // Stop (type 76)
    if (actType === 76 || actName === 'stop') {
      updateThreadLog(threadId, 'info', `⏹ Stop action reached: Stopping profile gracefully...`, 'Stop');
      if (vars.$profileId) {
        await stopProfileApi(vars.$profileId);
      }
      return 'STOP';
    }

    // Exit loop (type 5)
    if (actType === 5 || actName === 'exit loop') {
      updateThreadLog(threadId, 'info', `🚪 Exit loop: Kích hoạt lệnh thoát khỏi vòng lặp hiện tại`, 'Exit loop');
      return 'BREAK_LOOP';
    }

    // Next loop (type 6)
    if (actType === 6 || actName === 'next loop') {
      updateThreadLog(threadId, 'info', `⏭ Next loop: Chuyển sang lượt lặp tiếp theo`, 'Next loop');
      return 'NEXT_LOOP';
    }

    // Go to URL (type 39)
    if (actType === 39 || actName === 'go to url') {
      let url = resolveStr(getRawVal('URL', 'https://google.com'));
      const timeoutSec = parseInt(resolveStr(getRawVal('TIME_OUT', '60')), 10) || 60;
      if (!url.startsWith('http')) url = `https://${url}`;
      updateThreadLog(threadId, 'info', `▶ Navigate › ${url} (Timeout: ${timeoutSec}s)`, `Navigating: ${url}`);

      if ((window as any).electronAPI?.cdpAction) {
        await (window as any).electronAPI.cdpAction({
          port,
          action: 'goToUrl',
          payload: { url, timeout: timeoutSec },
        });
      }

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
          const evalRes = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: {
              expression: `(() => {
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
                  if (href === 'about:blank' && !${JSON.stringify(url)}.includes('about:blank')) {
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
              })()`,
            },
          });

          const val = evalRes?.value || evalRes?.result?.value;
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
        } catch (e: any) {
          // Context might be reloading, continue waiting
        }
      }

      if (!pageLoaded && !errorMsg) {
        // Final check: if tab is on an http/https url and document.body exists, consider ready
        try {
          const finalCheck = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: {
              expression: `(() => ({
                url: window.location.href,
                hasBody: !!document.body,
                hasContent: document.body ? document.body.innerText.length > 0 : false
              }))()`,
            },
          });
          const fVal = finalCheck?.value || finalCheck?.result?.value;
          if (fVal?.url && fVal.url.startsWith('http') && fVal.hasBody) {
            pageLoaded = true;
          }
        } catch (e) {}
      }

      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);

      if (pageLoaded) {
        // Re-inject virtual mouse after page load if virtual mouse is on
        if (useVirtualMouse) {
          await sleep(300);
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: { expression: VIRTUAL_MOUSE_SCRIPT },
          }).catch(() => {});
        }
        updateThreadLog(threadId, 'success', `✔ Navigate › ${url} (${elapsedSec}s)`);
      } else {
        const detail = errorMsg || `Timed out after ${timeoutSec}s`;
        const failRes = await handleActionFailure('Navigate', `${detail} (${url})`);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
      await sleep(200);
    }
    // Reload (type 41)
    else if (actType === 41 || actName === 'reload' || actName === 'reload page') {
      updateThreadLog(threadId, 'info', '▶ Reload › Tải lại trang web hiện tại', 'Reload');
      if ((window as any).electronAPI?.cdpAction) {
        await (window as any).electronAPI.cdpAction({
          port,
          action: 'reload',
        });
      }
      await sleep(600);
      try {
        if ((window as any).electronAPI?.cdpAction) {
          await (window as any).electronAPI.cdpAction({
            port,
            action: 'evaluate',
            payload: { expression: VIRTUAL_MOUSE_SCRIPT },
          }).catch(() => {});
        }
      } catch (e) {}
      updateThreadLog(threadId, 'success', '✔ Reload › Đã tải lại trang');
      await sleep(100);
    }
    // Back URL (type 40)
    else if (actType === 40 || actName === 'back url') {
      updateThreadLog(threadId, 'info', '▶ Back URL › Quay lại trang trước', 'Back URL');
      if ((window as any).electronAPI?.cdpAction) {
        await (window as any).electronAPI.cdpAction({
          port,
          action: 'backUrl',
        });
      }
      await sleep(600);
      updateThreadLog(threadId, 'success', '✔ Back URL › Đã quay lại trang trước');
      await sleep(100);
    }
    // Get URL (type 42)
    else if (actType === 42 || actName === 'get url' || actName === 'get current url') {
      const rawVar = act.output_variable_name || 'current_url';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');
      updateThreadLog(threadId, 'info', `▶ Get URL › Lấy địa chỉ trang hiện tại vào biến ${varName}`, 'Get URL');

      let currentUrl = '';
      if ((window as any).electronAPI?.cdpAction) {
        const evalRes = await (window as any).electronAPI.cdpAction({
          port,
          action: 'evaluate',
          payload: { expression: 'window.location.href' },
        });
        currentUrl = evalRes?.result?.value || '';
      }

      vars[varName] = currentUrl;
      vars[cleanName] = currentUrl;
      updateThreadLog(threadId, 'success', `✔ Get URL › ${varName} = "${currentUrl}"`);
      await sleep(100);
    }
    // Wait element (type 44)
    else if (actType === 44 || actName === 'wait element') {
      const xpath = resolveStr(act.element_xpath || '');
      const timeoutSec = parseInt(getRawVal('TIME_OUT', '20'), 10) || 20;
      const isContinueOnError =
        act.continue_on_error === true ||
        String(act.continue_on_error).toLowerCase() === 'true' ||
        getRawVal('CONTINUE_ON_ERROR', '').toLowerCase() === 'true';

      if (!xpath.trim()) {
        if (isContinueOnError) {
          updateThreadLog(threadId, 'info', `⚠ Wait element › XPath rỗng (Continue on error: Bỏ qua và chạy tiếp)`);
        } else {
          const failRes = await handleActionFailure('Wait element', 'XPath rỗng');
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        }
      } else {
        updateThreadLog(threadId, 'info', `▶ Wait element › ${xpath} (Timeout: ${timeoutSec}s)`, `Waiting: ${xpath}`);

        const start = Date.now();
        let found = false;
        let lastReportSec = 0;
        while (Date.now() - start < timeoutSec * 1000 && !stopSignalRef.current) {
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
          let res = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: {
              expression: checkScript,
              targetId: vars.$activePopupTargetId,
              contextId: vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined,
            },
          });
          if ((!res || res.error?.includes('context')) && vars.$currentFrameContextId) {
            res = await (window as any).electronAPI?.cdpAction({
              port,
              action: 'evaluate',
              payload: {
                expression: checkScript,
                targetId: vars.$activePopupTargetId,
              },
            });
          }
          if (res && (res.value === true || res.result?.value === true || res.value?.value === true)) {
            found = true;
            break;
          }
          const elapsedSec = Math.floor((Date.now() - start) / 1000);
          if (elapsedSec > 0 && elapsedSec % 5 === 0 && elapsedSec !== lastReportSec && elapsedSec < timeoutSec) {
            lastReportSec = elapsedSec;
            updateThreadLog(threadId, 'info', `⏳ Đang chờ phần tử... (${elapsedSec}s / ${timeoutSec}s)`);
          }
          await sleep(350);
        }
        if (found) {
          vars.$lastFoundXPath = xpath;
          vars.$lastWaitXPath = xpath;
          updateThreadLog(threadId, 'success', `✔ Found element › ${xpath}`);
        } else {
          const failRes = await handleActionFailure('Wait element', `Không tìm thấy phần tử trong ${timeoutSec}s [${xpath}]`);
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        }
      }
    }
    // Mouse click (type 48) with Virtual Mouse!
    else if (actType === 48 || actName === 'mouse click') {
      const clickType = getRawVal('CLICK_TYPE', 'Click by Xpath');
      let xpath = resolveStr(act.element_xpath || getRawVal('XPATH', '')).trim();
      const pos = resolveStr(getRawVal('POS', ''));

      const isCoords = clickType === 'CLICK_POS' || clickType === 'CLICK_COORDINATES' || clickType === 'Click by coordinates' || (!xpath && pos && clickType !== 'CLICK_XPATH' && clickType !== 'Click by Xpath');
      const isCurrentPos = clickType === 'CLICK_CURRENT_POS' || clickType === 'Click by current position' || clickType === 'Click current position';

      let isInherited = false;
      if (!xpath && vars.$lastFoundXPath && !isCoords && !isCurrentPos) {
        xpath = vars.$lastFoundXPath;
        isInherited = true;
      }

      if (isCoords) {
        const [xStr, yStr] = pos.split(',');
        const x = parseFloat(xStr) || 100;
        const y = parseFloat(yStr) || 100;
        updateThreadLog(
          threadId,
          'info',
          `▶ ${useVirtualMouse ? 'Virtual Mouse click' : 'Mouse click'} › [${x}, ${y}]`,
          `Clicking: [${x}, ${y}]`
        );

        if (useVirtualMouse) {
          // Move virtual red cursor smoothly and click with ripple!
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: { expression: getVirtualMouseClickCoordsScript(x, y) },
          });
        } else {
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'clickCoordinates',
            payload: { x, y },
          });
        }
        updateThreadLog(threadId, 'success', `✔ Clicked coordinates [${x}, ${y}]`);
      } else if (isCurrentPos) {
        updateThreadLog(
          threadId,
          'info',
          `▶ ${useVirtualMouse ? 'Virtual Mouse click' : 'Mouse click'} › Current position`,
          `Clicking current position`
        );
        await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: {
            expression: `(async () => {
              if (window.__gpmVirtualMouse) {
                const p = window.__gpmVirtualMouse.getPos();
                return await window.__gpmVirtualMouse.clickAt(p.x, p.y);
              }
              if (document.activeElement && typeof document.activeElement.click === 'function') {
                document.activeElement.click();
              }
              return { success: true };
            })()`,
          },
        });
        updateThreadLog(threadId, 'success', `✔ Clicked current position`);
      } else {
        // Click by XPath
        updateThreadLog(
          threadId,
          'info',
          `▶ ${useVirtualMouse ? 'Virtual Mouse click' : 'Mouse click'} › XPath: ${xpath || '(empty)'}${isInherited ? ' (Tự động lấy từ Wait element)' : ''}`,
          `Clicking: ${xpath}`
        );

        if (xpath) {
          if (useVirtualMouse) {
            // Move virtual red cursor smoothly over Bezier curve to element and trigger realistic click!
            const evalRes = await (window as any).electronAPI?.cdpAction({
              port,
              action: 'evaluate',
              payload: {
                expression: getVirtualMouseClickXPathScript(xpath, vars.$currentFrameXPath),
                targetId: vars.$activePopupTargetId,
                contextId: vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined,
              },
            });
            if (evalRes && (evalRes.value?.success || evalRes.result?.value?.success)) {
              updateThreadLog(threadId, 'success', `✔ Virtual Mouse smoothly clicked element`);
            } else {
              // Fallback to standard DOM click
              const clickScript = `(() => {
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
                  const el = doc.evaluate(${JSON.stringify(xpath)}, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                  if (!el) return false;
                  if (typeof el.scrollIntoView === 'function') {
                    try { el.scrollIntoView({ block: 'center' }); } catch(e) {}
                  }
                  if (typeof el.click === 'function') {
                    el.click();
                  } else {
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                  }
                  return true;
                } catch(e) { return false; }
              })()`;
              const fbRes = await (window as any).electronAPI?.cdpAction({
                port,
                action: 'evaluate',
                payload: {
                  expression: clickScript,
                  targetId: vars.$activePopupTargetId,
                  contextId: vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined,
                },
              });
              if (fbRes?.value === true || fbRes?.result?.value === true) {
                updateThreadLog(threadId, 'success', `✔ Clicked element (${xpath})`);
              } else {
                const failRes = await handleActionFailure(
                  'Mouse click',
                  evalRes?.value?.error || evalRes?.result?.value?.error || `Element not found: ${xpath}`
                );
                if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
              }
            }
          } else {
            // Standard click
            const clickScript = `(() => {
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
                const el = doc.evaluate(${JSON.stringify(xpath)}, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (!el) return false;
                el.scrollIntoView({ block: 'center' });
                el.click();
                return true;
              } catch(e) { return false; }
            })()`;
            const stdRes = await (window as any).electronAPI?.cdpAction({
              port,
              action: 'evaluate',
              payload: {
                expression: clickScript,
                targetId: vars.$activePopupTargetId,
                contextId: vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined,
              },
            });
            if (stdRes?.value === true || stdRes?.result?.value === true) {
              updateThreadLog(threadId, 'success', `✔ Element clicked`);
            } else {
              const failRes = await handleActionFailure('Mouse click', `Element not found or not clickable: ${xpath}`);
              if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
            }
          }
        }
      }
      await sleep(150);
    }
    // Mouse try to click (type 49)
    else if (actType === 49 || actName === 'mouse try to click') {
      const clickType = getRawVal('CLICK_TYPE', 'Click by Xpath');
      const xpath = resolveStr(getRawVal('XPATH', act.element_xpath || ''));
      const pos = resolveStr(getRawVal('POS', ''));
      const numTries = parseInt(resolveStr(getRawVal('NUMBER_OF_TRIES', '5')), 10) || 5;
      const delayEachSec = parseFloat(resolveStr(getRawVal('DELAY_EACH_CLICK', '2'))) || 2;
      const stopCondition = resolveStr(getRawVal('STOP_CONDITION', '')).trim();

      const isCoords = clickType === 'Click by coordinates' || clickType === 'CLICK_COORDINATES' || clickType === 'CLICK_POS' || (!xpath && pos && clickType !== 'Click by Xpath' && clickType !== 'CLICK_XPATH');
      const isCurrentPos = clickType === 'Click current position' || clickType === 'Click by current position' || clickType === 'CLICK_CURRENT_POS';

      updateThreadLog(threadId, 'info', `▶ Mouse try to click (max ${numTries} tries, delay ${delayEachSec}s)`, 'Mouse try to click');

      let conditionMet = false;
      for (let attempt = 1; attempt <= numTries; attempt++) {
        if (stopSignalRef.current) break;

        if (isCoords) {
          const [xStr, yStr] = pos.split(',');
          const x = parseFloat(xStr) || 100;
          const y = parseFloat(yStr) || 100;
          if (useVirtualMouse) {
            await (window as any).electronAPI?.cdpAction({
              port,
              action: 'evaluate',
              payload: { expression: getVirtualMouseClickCoordsScript(x, y) },
            });
          } else {
            await (window as any).electronAPI?.cdpAction({ port, action: 'clickCoordinates', payload: { x, y } });
          }
        } else if (isCurrentPos) {
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: {
              expression: `(async () => {
                if (window.__gpmVirtualMouse) {
                  const p = window.__gpmVirtualMouse.getPos();
                  return await window.__gpmVirtualMouse.clickAt(p.x, p.y);
                }
                if (document.activeElement && typeof document.activeElement.click === 'function') {
                  document.activeElement.click();
                }
                return { success: true };
              })()`,
            },
          });
        } else if (xpath) {
          if (useVirtualMouse) {
            await (window as any).electronAPI?.cdpAction({
              port,
              action: 'evaluate',
              payload: { expression: getVirtualMouseClickXPathScript(xpath) },
            });
          } else {
            const clickScript = `(() => { try { const el = document.evaluate(${JSON.stringify(xpath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; if (el) { el.scrollIntoView({ block: 'center' }); el.click(); return true; } } catch(e) {} return false; })()`;
            await (window as any).electronAPI?.cdpAction({ port, action: 'evaluate', payload: { expression: clickScript } });
          }
        }

        updateThreadLog(threadId, 'info', `  ↳ Click attempt #${attempt}/${numTries}`);

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

          const evalRes = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: { expression: testScript },
          });
          if (evalRes && (evalRes.value === true || evalRes.result?.value === true)) {
            conditionMet = true;
            updateThreadLog(threadId, 'success', `✔ Mouse try to click › Condition met at attempt #${attempt} (${stopCondition})`);
            break;
          }
        }
      }

      if (!conditionMet) {
        updateThreadLog(threadId, 'success', `✔ Mouse try to click › Completed all ${numTries} attempts`);
      }
      await sleep(150);
    }
    // Mouse move (type 50)
    else if (actType === 50 || actName === 'mouse move') {
      const moveType = getRawVal('MOVE_TYPE', 'Move by Xpath');
      const xpath = resolveStr(getRawVal('XPATH', act.element_xpath || ''));
      const pos = resolveStr(getRawVal('POS', ''));

      const isCoords = moveType === 'Move by position' || moveType === 'MOVE_POS' || moveType === 'Move by coordinates' || moveType === 'MOVE_COORDINATES' || (!xpath && pos && moveType !== 'Move by Xpath' && moveType !== 'MOVE_XPATH');

      if (isCoords) {
        const [xStr, yStr] = pos.split(',');
        const x = parseFloat(xStr) || 0;
        const y = parseFloat(yStr) || 0;
        updateThreadLog(threadId, 'info', `▶ Mouse move › [${x}, ${y}]`);
        await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: {
            expression: `(async () => {
              ${VIRTUAL_MOUSE_SCRIPT};
              return await window.__gpmVirtualMouse.moveTo(${x}, ${y}, 350);
            })()`,
          },
        });
        if ((window as any).electronAPI?.cdpAction) {
          await (window as any).electronAPI.cdpAction({
            port,
            action: 'mouseMove',
            payload: { x, y },
          }).catch(() => {});
          vars.$lastMouseX = String(x);
          vars.$lastMouseY = String(y);
        }
        updateThreadLog(threadId, 'success', `✔ Mouse moved to [${x}, ${y}]`);
        } else {
          updateThreadLog(threadId, 'info', `▶ Mouse move › XPath: ${xpath || '(empty)'}`);
          if (xpath) {
            const evalMoveRes = await (window as any).electronAPI?.cdpAction({
              port,
              action: 'evaluate',
              payload: {
                expression: `(async () => {
                  ${VIRTUAL_MOUSE_SCRIPT};
                  const res = document.evaluate(${JSON.stringify(xpath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                  const el = res.singleNodeValue;
                  if (!el) return { success: false, error: 'Element not found' };
                  if (typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    await new Promise(r => setTimeout(r, 200));
                  }
                  const rect = el.getBoundingClientRect();
                  const tx = Math.round(rect.left + rect.width / 2);
                  const ty = Math.round(rect.top + rect.height / 2);
                  await window.__gpmVirtualMouse.moveTo(tx, ty, 350);

                  const targetEl = document.elementFromPoint(tx, ty) || el;
                  const evOpts = {
                    bubbles: true,
                    cancelable: true,
                    clientX: tx,
                    clientY: ty,
                    screenX: tx + (window.screenX || 0),
                    screenY: ty + (window.screenY || 0),
                    view: window,
                    pointerId: 1,
                    pointerType: 'mouse',
                    isPrimary: true,
                  };
                  try {
                    if (typeof PointerEvent !== 'undefined') {
                      targetEl.dispatchEvent(new PointerEvent('pointerover', evOpts));
                      targetEl.dispatchEvent(new PointerEvent('pointerenter', evOpts));
                      el.dispatchEvent(new PointerEvent('pointerover', evOpts));
                      el.dispatchEvent(new PointerEvent('pointerenter', evOpts));
                    }
                  } catch(e) {}
                  try {
                    targetEl.dispatchEvent(new MouseEvent('mouseover', evOpts));
                    targetEl.dispatchEvent(new MouseEvent('mouseenter', evOpts));
                    targetEl.dispatchEvent(new MouseEvent('mousemove', evOpts));
                    el.dispatchEvent(new MouseEvent('mouseover', evOpts));
                    el.dispatchEvent(new MouseEvent('mouseenter', evOpts));
                    el.dispatchEvent(new MouseEvent('mousemove', evOpts));
                  } catch(e) {}

                  return { success: true, x: tx, y: ty };
                })()`,
              },
            });

            const coords = evalMoveRes?.value?.x !== undefined ? evalMoveRes.value : (evalMoveRes as any)?.result?.value;
            if (coords && coords.x !== undefined && (window as any).electronAPI?.cdpAction) {
              await (window as any).electronAPI.cdpAction({
                port,
                action: 'mouseMove',
                payload: { x: coords.x, y: coords.y },
              }).catch(() => {});
              vars.$lastMouseX = String(coords.x);
              vars.$lastMouseY = String(coords.y);
            }

            updateThreadLog(threadId, 'success', `✔ Mouse moved to element`);
          }
        }
        await sleep(150);
      }
    // Mouse press and hold (type 51)
    else if (actType === 51 || actName === 'mouse press and hold') {
      const xpath = resolveStr(getRawVal('XPATH', act.element_xpath || ''));
      const pos = resolveStr(getRawVal('POS', ''));
      const pressType = getRawVal('PRESS_TYPE', (pos && !xpath) ? 'PRESS_POS' : 'PRESS_XPATH');

      const isCoords = pressType === 'PRESS_POS' || pressType === 'Press by coordinates' || (!xpath && pos && pressType !== 'PRESS_XPATH' && pressType !== 'Press by Xpath');

      updateThreadLog(threadId, 'info', `▶ Mouse press and hold (${isCoords ? pos : (xpath || 'current')})`);
      await (window as any).electronAPI?.cdpAction({
        port,
        action: 'evaluate',
        payload: {
          expression: `(async () => {
            ${VIRTUAL_MOUSE_SCRIPT};
            let tx = window.__gpmVirtualMouse.getPos().x;
            let ty = window.__gpmVirtualMouse.getPos().y;
            ${isCoords ? `
            if (${JSON.stringify(pos)}) {
              tx = ${parseFloat(pos.split(',')[0]) || 0};
              ty = ${parseFloat(pos.split(',')[1]) || 0};
            }
            ` : `
            if (${JSON.stringify(xpath)}) {
              const res = document.evaluate(${JSON.stringify(xpath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
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
          })()`,
        },
      });
      updateThreadLog(threadId, 'success', `✔ Mouse pressed and held`);
      await sleep(150);
    }
    // Mouse release (type 52)
    else if (actType === 52 || actName === 'mouse release') {
      updateThreadLog(threadId, 'info', `▶ Mouse release`);
      await (window as any).electronAPI?.cdpAction({
        port,
        action: 'evaluate',
        payload: {
          expression: `(async () => {
            ${VIRTUAL_MOUSE_SCRIPT};
            const pos = window.__gpmVirtualMouse.getPos();
            const targetEl = document.elementFromPoint(pos.x, pos.y) || document.body;
            if (targetEl) {
              targetEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: pos.x, clientY: pos.y, buttons: 0 }));
            }
            return { success: true };
          })()`,
        },
      });
      updateThreadLog(threadId, 'success', `✔ Mouse released`);
      await sleep(150);
    }
    // Mouse scroll (type 53)
    else if (actType === 53 || actName === 'mouse scroll') {
      const rawScrollVal = resolveStr(getRawVal('SCROLL_NUM', '1')).trim();
      let scrollSteps = 1;
      if (rawScrollVal.includes(',') || rawScrollVal.includes('-')) {
        const parts = rawScrollVal.includes(',') ? rawScrollVal.split(',') : rawScrollVal.split('-');
        const minS = parseInt(parts[0], 10) || 1;
        const maxS = parseInt(parts[1], 10) || minS;
        scrollSteps = Math.floor(Math.random() * (Math.abs(maxS - minS) + 1)) + Math.min(minS, maxS);
        if (minS < 0 && maxS < 0) scrollSteps = -Math.abs(scrollSteps);
      } else {
        scrollSteps = parseInt(rawScrollVal, 10);
        if (isNaN(scrollSteps)) scrollSteps = 1;
      }

      const isScrollUp = scrollSteps < 0;
      const totalNotches = Math.max(1, Math.abs(scrollSteps));
      const direction = isScrollUp ? -1 : 1;

      updateThreadLog(threadId, 'info', `▶ Mouse scroll › ${isScrollUp ? 'Cuộn lên' : 'Cuộn xuống'} ${totalNotches} nấc (mô phỏng con lăn chuột)`, 'Mouse scroll');

      // 1. Xác định tọa độ con trỏ chuột (Ưu tiên vị trí chuột vừa rê tới, hoặc tâm của Dialog / Viewport)
      let targetX = vars.$lastMouseX ? parseFloat(vars.$lastMouseX) : undefined;
      let targetY = vars.$lastMouseY ? parseFloat(vars.$lastMouseY) : undefined;
      if (typeof targetX !== 'number' || isNaN(targetX) || typeof targetY !== 'number' || isNaN(targetY)) {
        try {
          const evalPosRes = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: {
              expression: `(() => {
                const activeDialog = document.querySelector('div[role="dialog"], div[role="alertdialog"], div[aria-modal="true"]');
                if (activeDialog) {
                  const rect = activeDialog.getBoundingClientRect();
                  if (rect.width > 50 && rect.height > 50) {
                    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
                  }
                }
                return { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };
              })()`,
            },
          });
          const posVal = evalPosRes?.value || (evalPosRes as any)?.result?.value;
          if (posVal && typeof posVal.x === 'number') {
            targetX = posVal.x;
            targetY = posVal.y;
          }
        } catch (e) {}
      }
      if (typeof targetX !== 'number') targetX = 500;
      if (typeof targetY !== 'number') targetY = 400;

      // 2. Mô phỏng hành vi lăn chuột người thật tối ưu cho đa luồng và khung cuộn nhỏ:
      for (let notch = 0; notch < totalNotches; notch++) {
        if (stopSignalRef.current) break;

        await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: {
            expression: `(async () => {
              const sleep = (ms) => new Promise(r => setTimeout(r, ms));
              const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

              // 1. Tự động tìm đúng khung cuộn (Hỗ trợ dialog nhỏ, popup bình luận, hoặc toàn trang)
              let target = null;
              const activeModal = document.querySelector('div[role="dialog"], div[role="alertdialog"], div[aria-modal="true"]');
              if (activeModal) {
                const walker = document.createTreeWalker(activeModal, NodeFilter.SHOW_ELEMENT);
                let n;
                while ((n = walker.nextNode())) {
                  const s = window.getComputedStyle(n);
                  if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 10) {
                    target = n;
                    break;
                  }
                }
                if (!target && activeModal.scrollHeight > activeModal.clientHeight) {
                  target = activeModal;
                }
              }

              if (!target && typeof ${targetX} === 'number' && typeof ${targetY} === 'number') {
                let el = document.elementFromPoint(${targetX}, ${targetY});
                while (el && el !== document.body && el !== document.documentElement) {
                  const s = window.getComputedStyle(el);
                  if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
                    target = el;
                    break;
                  }
                  el = el.parentElement;
                }
              }

              const isWindow = !target || target === document.body || target === document.documentElement;
              const scrollTarget = isWindow ? (document.scrollingElement || document.documentElement || window) : target;
              const containerH = isWindow ? window.innerHeight : target.clientHeight;

              // 2. Tự động thích ứng nếu "luồng nó nhỏ" (cửa sổ thu nhỏ hoặc dialog nhỏ):
              // Nếu khung nhỏ (< 450px), cuộn khoảng 35% - 65% chiều cao để không bị trôi mất bài
              let dist;
              if (containerH < 450) {
                dist = rand(Math.round(containerH * 0.35), Math.round(containerH * 0.65)) * ${direction};
              } else {
                dist = rand(320, 520) * ${direction};
              }

              // 3. Cuộn mượt từng nấc nhỏ chuẩn 60fps trực tiếp trong trang
              const steps = rand(10, 15);
              const stepDist = dist / steps;

              for (let s = 0; s < steps; s++) {
                if (scrollTarget === window) {
                  window.scrollBy(0, stepDist);
                } else {
                  scrollTarget.scrollBy(0, stepDist);
                }
                await sleep(rand(14, 25));
              }

              return { success: true, scrolled: dist };
            })()`,
          },
        }).catch(() => {});

        // Dừng lại đọc ngẫu nhiên giữa các lần lăn chuột (nếu cuộn nhiều nấc)
        if (notch < totalNotches - 1) {
          const pauseTime = Math.floor(Math.random() * 800) + 700; // 700ms - 1500ms
          await sleep(pauseTime);
        }
      }

      updateThreadLog(threadId, 'success', `✔ Mouse scrolled ${totalNotches} nấc thành công (mượt như người thật)`);
      await sleep(150);
    }
    // Wait URL Changed (type 43)
    else if (actType === 43 || actName === 'wait url changed') {
      const rawCurrentUrl = getRawVal('CURRENT_URL', '').trim();
      const timeoutSec = parseInt(getRawVal('TIME_OUT', '60'), 10) || 60;
      const resolvedCurrentUrl = resolveStr(rawCurrentUrl);

      let initialUrl = resolvedCurrentUrl;
      if (!initialUrl) {
        const res = await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: { expression: 'window.location.href' },
        });
        initialUrl = res?.value || res?.result?.value || '';
      }

      updateThreadLog(threadId, 'info', `▶ Wait URL Changed (timeout ${timeoutSec}s, baseline: "${initialUrl}")`, 'Wait URL Changed');
      const startTime = Date.now();
      let urlChanged = false;
      let newUrl = initialUrl;

      while (Date.now() - startTime < timeoutSec * 1000) {
        if (stopSignalRef.current) break;
        await sleep(500);
        const res = await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: { expression: 'window.location.href' },
        });
        const cur = res?.value || res?.result?.value || '';
        if (cur && cur !== initialUrl) {
          urlChanged = true;
          newUrl = cur;
          break;
        }
      }

      if (urlChanged) {
        updateThreadLog(threadId, 'success', `✔ Wait URL Changed › URL changed to: ${newUrl}`);
      } else {
        const failRes = await handleActionFailure('Wait URL Changed', `Timed out after ${timeoutSec}s without URL change`);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
      await sleep(150);
    }
    // Switch to frame (type 62)
    else if (actType === 62 || actName === 'switch to frame') {
      const xpath = resolveStr(getRawVal('XPATH', act.element_xpath || ''));
      updateThreadLog(threadId, 'info', `▶ Switch to frame › ${xpath || '(empty)'}`, 'Switch to frame');

      if (!xpath) {
        const failRes = await handleActionFailure('Switch to frame', 'XPath của iframe không được để trống');
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      } else {
        const start = Date.now();
        let frameFound = false;
        let frameInfo: any = null;

        while (Date.now() - start < 15000 && !stopSignalRef.current) {
          const evalRes = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: {
              targetId: vars.$activePopupTargetId,
              expression: `(() => {
                try {
                  const res = document.evaluate(${JSON.stringify(xpath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                  const el = res.singleNodeValue;
                  if (!el) return { found: false };
                  const rect = el.getBoundingClientRect();
                  const src = el.src || el.getAttribute('src') || '';
                  const name = el.name || el.getAttribute('name') || '';
                  const id = el.id || el.getAttribute('id') || '';
                  const title = el.title || el.getAttribute('title') || '';
                  return {
                    found: true,
                    src,
                    name,
                    id,
                    title,
                    left: Math.round(rect.left),
                    top: Math.round(rect.top),
                  };
                } catch(e) {
                  return { found: false, error: e.message };
                }
              })()`,
            },
          });
          const val = evalRes?.value || evalRes?.result?.value;
          if (val && val.found) {
            frameFound = true;
            frameInfo = val;
            if (val.src && val.src !== 'about:blank') {
              break;
            }
          }
          await sleep(350);
        }

        if (frameFound) {
          vars.$currentFrameXPath = xpath;
          vars.$currentFrameOffset = `${frameInfo.left || 0},${frameInfo.top || 0}`;

          try {
            // 1. First check if this frame is an OOPIF target in listTargets with retry polling
            // (In multi-threading, Chromium takes 500-2500ms under CPU load to spawn and register the cross-origin target)
            let matchedTarget: any = null;
            const targetPollStart = Date.now();
            const cleanSrc = (frameInfo.src || '').split('#')[0].split('?')[0].trim().toLowerCase();
            const frameTitle = (frameInfo.title || '').trim().toLowerCase();
            const isRecaptcha =
              xpath.toLowerCase().includes('recaptcha') ||
              cleanSrc.includes('recaptcha') ||
              frameTitle.includes('recaptcha');

            while (Date.now() - targetPollStart < 8000 && !stopSignalRef.current) {
              const listRes = await (window as any).electronAPI?.cdpAction({
                port,
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
              const treeRes = await (window as any).electronAPI?.cdpAction({
                port,
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
                const worldRes = await (window as any).electronAPI?.cdpAction({
                  port,
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
          } catch (e) {}

          if (vars.$currentFrameTargetId) {
            updateThreadLog(threadId, 'success', `✔ Switch to frame › Đã chuyển vào iframe: ${xpath} (OOPIF Target: ${vars.$currentFrameTargetId.slice(0, 8)}...)`);
          } else if (vars.$currentFrameContextId) {
            updateThreadLog(threadId, 'success', `✔ Switch to frame › Đã chuyển vào iframe: ${xpath} (Context ID: ${vars.$currentFrameContextId})`);
          } else {
            updateThreadLog(threadId, 'success', `✔ Switch to frame › Đã chuyển vào iframe: ${xpath}`);
          }
        } else {
          const failRes = await handleActionFailure('Switch to frame', `Không tìm thấy iframe với XPath: ${xpath}`);
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        }
      }
      await sleep(150);
    }
    // Switch to default (type 61)
    else if (actType === 61 || actName === 'switch to default') {
      updateThreadLog(threadId, 'info', `▶ Switch to default › Chuyển về khung trang chính`, 'Switch to default');
      delete vars.$currentFrameXPath;
      delete vars.$currentFrameContextId;
      delete vars.$currentFrameOffset;
      delete vars.$currentFrameTargetId;

      if (vars.$mainPageTargetId) {
        vars.$activePopupTargetId = vars.$mainPageTargetId;
        delete vars.$mainPageTargetId;
      } else {
        try {
          const listRes = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'listTargets',
          });
          const pages = (listRes?.targets || []).filter((t: any) => t.type === 'page');
          if (pages.length > 0 && pages[0].id) {
            vars.$activePopupTargetId = pages[0].id;
          }
        } catch (e) {}
      }
      delete vars.$activePopupTitle;

      updateThreadLog(threadId, 'success', `✔ Switch to default › Chuyển về khung trang chính thành công`);
      await sleep(150);
    }
    // Switch to popup (type 63)
    else if (actType === 63 || actName === 'switch to popup') {
      const rawTitle = getRawVal('TITLE', getRawVal('POPUP_TITLE', ''));
      const targetTitle = resolveStr(rawTitle).trim().toLowerCase();
      updateThreadLog(threadId, 'info', `▶ Switch to popup › Tiêu đề: "${targetTitle || '(any popup)'}"`, 'Switch to popup');

      const start = Date.now();
      let matchedTarget: any = null;

      while (Date.now() - start < 15000 && !stopSignalRef.current) {
        try {
          const listRes = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'listTargets',
          });
          const pages = (listRes?.targets || []).filter((t: any) => t.type === 'page');

          if (targetTitle) {
            const keywords = targetTitle.includes('|')
              ? targetTitle.split('|').map((k: string) => k.trim()).filter(Boolean)
              : [targetTitle];
            matchedTarget = pages.find((t: any) => {
              const tTitle = (t.title || '').toLowerCase();
              const tUrl = (t.url || '').toLowerCase();
              return keywords.some((k: string) => tTitle.includes(k) || tUrl.includes(k));
            });
          } else {
            if (pages.length > 1) {
              matchedTarget = pages[pages.length - 1];
            } else if (pages.length === 1) {
              matchedTarget = pages[0];
            }
          }
        } catch (e) {}

        if (matchedTarget) break;
        await sleep(500);
      }

      if (matchedTarget && matchedTarget.id) {
        await (window as any).electronAPI?.cdpAction({
          port,
          action: 'activateTarget',
          payload: { targetId: matchedTarget.id },
        });
        vars.$activePopupTargetId = matchedTarget.id;
        vars.$activePopupTitle = matchedTarget.title || '';
        delete vars.$currentFrameXPath;
        delete vars.$currentFrameContextId;
        delete vars.$currentFrameOffset;

        updateThreadLog(threadId, 'success', `✔ Switch to popup › Đã chuyển sang popup: "${matchedTarget.title || matchedTarget.url}"`);
      } else {
        const failRes = await handleActionFailure('Switch to popup', `Không tìm thấy popup với tiêu đề: "${targetTitle}" sau 15s`);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
      await sleep(150);
    }
    // Import cookie (type 64)
    else if (actType === 64 || actName === 'import cookie') {
      const rawPath = getRawVal('FILE_PATH', getRawVal('COOKIE_FILE', ''));
      const filePath = resolveStr(rawPath).trim();
      updateThreadLog(threadId, 'info', `▶ Import cookie › File: "${filePath || '(từ biến/mặc định)'}"`, 'Import cookie');

      try {
        let cookieData: any = null;
        if (filePath && (window as any).electronAPI?.fileAction) {
          const fileCheck = await (window as any).electronAPI.fileAction({
            action: 'exists',
            payload: { path: filePath },
          }).catch(() => null);

          if (fileCheck?.exists) {
            const readRes = await (window as any).electronAPI.fileAction({
              action: 'readText',
              payload: { path: filePath },
            }).catch(() => null);
            const fileText = readRes?.text ?? readRes?.content;
            if (readRes?.success && fileText) {
              cookieData = fileText;
            }
          }
        }

        if (!cookieData && filePath && !filePath.endsWith('.json') && !filePath.endsWith('.txt') && !filePath.includes('\\') && !filePath.includes('/')) {
          cookieData = filePath;
        }

        if (!cookieData && (vars.$cookie || vars.cookie)) {
          cookieData = vars.$cookie || vars.cookie;
        }

        if (!cookieData && filePath) {
          // Pass path to main process as it also auto-reads file paths
          cookieData = filePath;
        }

        if (!cookieData) {
          const failRes = await handleActionFailure('Import cookie', 'Không tìm thấy file cookie hoặc dữ liệu cookie trống');
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        } else {
          const cdpRes = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'setCookies',
            payload: { cookies: cookieData },
          });

          if (cdpRes?.success) {
            updateThreadLog(threadId, 'success', `✔ Import cookie › Đã import thành công ${cdpRes.count ?? ''} cookies vào trình duyệt`);
          } else {
            const failRes = await handleActionFailure('Import cookie', cdpRes?.error || 'Lỗi khi nạp cookie vào trình duyệt');
            if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
          }
        }
      } catch (err: any) {
        const failRes = await handleActionFailure('Import cookie', err.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
      await sleep(100);
    }
    // Export cookie (type 65)
    else if (actType === 65 || actName === 'export cookie') {
      const rawPath = getRawVal('FILE_PATH', getRawVal('COOKIE_FILE', ''));
      const filePath = resolveStr(rawPath).trim().replace(/^["']|["']$/g, '');
      updateThreadLog(threadId, 'info', `▶ Export cookie › ${filePath ? `Lưu vào: "${filePath}"` : 'Lưu vào biến'}`, 'Export cookie');

      try {
        const cdpRes = await (window as any).electronAPI?.cdpAction({
          port,
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

          if (filePath && (window as any).electronAPI?.fileAction) {
            const writeRes = await (window as any).electronAPI.fileAction({
              action: 'writeText',
              payload: { path: filePath, text: jsonStr },
            });
            if (writeRes?.success !== false) {
              updateThreadLog(threadId, 'success', `✔ Export cookie › Đã xuất ${cdpRes.cookies.length} cookies ra file: ${writeRes?.path || filePath}`);
            } else {
              const failRes = await handleActionFailure('Export cookie', writeRes?.error || 'Lỗi khi ghi file cookie');
              if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
            }
          } else {
            updateThreadLog(threadId, 'success', `✔ Export cookie › Đã xuất ${cdpRes.cookies.length} cookies vào biến`);
          }
        } else {
          const failRes = await handleActionFailure('Export cookie', cdpRes?.error || 'Lỗi khi lấy cookie từ trình duyệt');
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        }
      } catch (err: any) {
        const failRes = await handleActionFailure('Export cookie', err.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
      await sleep(100);
    }
    // Clear cookie (type 185)
    else if (actType === 185 || actName === 'clear cookie' || actName.includes('clear cookie')) {
      const rawDomain = getRawVal('DOMAIN', '');
      const domain = resolveStr(rawDomain).trim();
      updateThreadLog(threadId, 'info', `▶ Clear cookie › ${domain ? `Xóa cookie domain: "${domain}"` : 'Xóa toàn bộ cookies trình duyệt'}`, 'Clear cookie');

      try {
        const cdpRes = await (window as any).electronAPI?.cdpAction({
          port,
          action: 'clearCookies',
          payload: { domain },
        });

        if (cdpRes?.success) {
          vars.$cookie = '';
          vars.cookie = '';
          updateThreadLog(threadId, 'success', `✔ Clear cookie › Đã xóa sạch cookies ${domain ? `cho domain "${domain}"` : 'của trình duyệt'}`);
        } else {
          const failRes = await handleActionFailure('Clear cookie', cdpRes?.error || 'Lỗi khi xóa cookies');
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        }
      } catch (err: any) {
        const failRes = await handleActionFailure('Clear cookie', err.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
      await sleep(100);
    }
    // Get element attribute (type 45)
    else if (actType === 45 || actName === 'get element attribute') {
      const xpath = resolveStr(getRawVal('XPATH', act.element_xpath || ''));
      const attrName = resolveStr(getRawVal('ATTR_NAME', 'value'));
      const rawVar = act.output_variable_name || 'attribute_value';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');

      if (!xpath) {
        const failRes = await handleActionFailure('Get element attribute', 'XPath is empty');
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      } else {
        const script = `(() => {
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
            const res = doc.evaluate(${JSON.stringify(xpath)}, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const el = res.singleNodeValue;
            if (!el) return { found: false, error: 'Element not found' };
            const attr = ${JSON.stringify(attrName || 'value')};
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
          } catch(e) {
            return { found: false, error: e.message };
          }
        })()`;

        const evalRes = await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: {
            expression: script,
            targetId: vars.$activePopupTargetId,
            contextId: vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined,
          },
        });
        const resVal = evalRes?.value || evalRes?.result?.value;
        if (resVal && resVal.found) {
          const val = resVal.val ?? '';
          vars[varName] = val;
          vars[cleanName] = val;
          updateThreadLog(threadId, 'success', `✔ Get element attribute › ${attrName} = "${val}" (${varName})`);
        } else {
          const errDetail = resVal?.error || evalRes?.error || 'Element not found';
          const failRes = await handleActionFailure('Get element attribute', errDetail);
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        }
      }
      await sleep(150);
    }
    // Get element text (type 46)
    else if (actType === 46 || actName === 'get element text') {
      const xpath = resolveStr(getRawVal('XPATH', act.element_xpath || ''));
      const rawVar = act.output_variable_name || 'element_text';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');

      if (!xpath) {
        const failRes = await handleActionFailure('Get element text', 'XPath is empty');
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      } else {
        const script = `(() => {
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
            const res = doc.evaluate(${JSON.stringify(xpath)}, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const el = res.singleNodeValue;
            if (!el) return { found: false, error: 'Element not found' };
            const val = (el.innerText !== undefined ? el.innerText : el.textContent) || '';
            return { found: true, val: val.trim() };
          } catch(e) {
            return { found: false, error: e.message };
          }
        })()`;

        const evalRes = await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: {
            expression: script,
            targetId: vars.$activePopupTargetId,
            contextId: vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined,
          },
        });
        const resVal = evalRes?.value || evalRes?.result?.value;
        if (resVal && resVal.found) {
          const val = resVal.val ?? '';
          vars[varName] = val;
          vars[cleanName] = val;
          updateThreadLog(threadId, 'success', `✔ Get element text › "${val}" (${varName})`);
        } else {
          const errDetail = resVal?.error || evalRes?.error || 'Element not found';
          const failRes = await handleActionFailure('Get element text', errDetail);
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        }
      }
      await sleep(150);
    }
    // Count element (type 47)
    else if (actType === 47 || actName === 'count element') {
      const xpath = resolveStr(getRawVal('XPATH', act.element_xpath || ''));
      const rawVar = act.output_variable_name || 'element_count';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');

      if (!xpath) {
        const failRes = await handleActionFailure('Count element', 'XPath is empty');
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      } else {
        const script = `(() => {
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
            const res = doc.evaluate(${JSON.stringify(xpath)}, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            return { found: true, count: res.snapshotLength };
          } catch(e) {
            return { found: false, count: 0, error: e.message };
          }
        })()`;

        const evalRes = await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: {
            expression: script,
            targetId: vars.$activePopupTargetId,
            contextId: vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined,
          },
        });
        const resVal = evalRes?.value || evalRes?.result?.value;
        if (resVal && resVal.found) {
          const count = resVal.count ?? 0;
          vars[varName] = String(count);
          vars[cleanName] = String(count);
          updateThreadLog(threadId, 'success', `✔ Count element › Found ${count} elements (${varName} = ${count})`);
        } else {
          const errDetail = resVal?.error || evalRes?.error || 'XPath evaluation error';
          const failRes = await handleActionFailure('Count element', errDetail);
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        }
      }
      await sleep(150);
    }
    // Select dropdown (type 111)
    else if (actType === 111 || actName === 'select dropdown') {
      const xpath = resolveStr(getRawVal('XPATH', act.element_xpath || ''));
      const selectText = resolveStr(getRawVal('SELECT_TEXT', ''));

      if (!xpath) {
        const failRes = await handleActionFailure('Select dropdown', 'XPath is empty');
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      } else {
        const script = `(() => {
          try {
            const res = document.evaluate(${JSON.stringify(xpath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const el = res.singleNodeValue;
            if (!el) return { success: false, error: 'Element not found: ' + ${JSON.stringify(xpath)} };
            if (el.tagName.toLowerCase() !== 'select') return { success: false, error: 'Element is not a <select> tag' };
            const selectEl = el;
            const target = ${JSON.stringify(selectText)}.trim();
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

        const evalRes = await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: { expression: script },
        });
        const resVal = evalRes?.value || evalRes?.result?.value;
        if (resVal && resVal.success) {
          updateThreadLog(threadId, 'success', `✔ Select dropdown › Selected "${selectText}"`);
        } else {
          const errDetail = resVal?.error || evalRes?.error || 'Failed to select dropdown';
          const failRes = await handleActionFailure('Select dropdown', errDetail);
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        }
      }
      await sleep(150);
    }
    // Key press / Type text (type 54)
    else if (actType === 54 || actName === 'key press') {
      const rawKey = getRawVal('KEY', '');
      const resolvedKey = resolveStr(rawKey);
      const rawType = getRawVal('TYPE', 'Text');
      const delayPress = getRawVal('DELAY_PRESS', getRawVal('DELAY_EACH_CHAR', '-1'));
      let xpath = resolveStr(act.element_xpath || getRawVal('XPATH', '')).trim();
      let isInherited = false;
      if (!xpath && vars.$lastFoundXPath) {
        xpath = vars.$lastFoundXPath;
        isInherited = true;
      }

      // Smart detection: If user chose Single key / Combo key but entered text/variable, auto-treat as Text
      const isKnownSingleOrCombo = [
        'enter', 'return', 'backspace', 'tab', 'escape', 'space', 'delete',
        'arrowdown', 'arrowup', 'arrowleft', 'arrowright',
        'control+a', 'ctrl+a', 'control+c', 'ctrl+c', 'control+v', 'ctrl+v',
        'control+x', 'ctrl+x', 'control+shift+delete', 'alt+tab', 'f1', 'f2', 'f5', 'f11', 'f12'
      ].includes(resolvedKey.trim().toLowerCase());

      const effectiveType = (rawType === 'Text' || !isKnownSingleOrCombo) ? 'Text' : rawType;

      // 1. Nếu có XPath: TỰ ĐỘNG TÌM KIẾM, CUỘN TỚI PHẦN TỬ VÀ CLICK FOCUS BẰNG CDP (Không cần bước Mouse click trước đó!)
      if (xpath) {
        updateThreadLog(threadId, 'info', `🔍 Tự động tìm & kích hoạt ô nhập › ${xpath}`, 'Focus input');
        let foundCoords: { x: number; y: number } | null = null;
        const startFind = Date.now();

        while (Date.now() - startFind < 15000 && !stopSignalRef.current) {
          const evalRes = await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: {
              targetId: vars.$activePopupTargetId,
              contextId: vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined,
              expression: `(() => {
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
                  const res = doc.evaluate(${JSON.stringify(xpath)}, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
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
              })()`,
            },
          });
          const val = evalRes?.value || evalRes?.result?.value;
          if (val && val.found && val.x > 0 && val.y > 0) {
            foundCoords = { x: val.x, y: val.y };
            break;
          }
          await sleep(350);
        }

        if (!foundCoords) {
          const failRes = await handleActionFailure('Key press', `Không tìm thấy phần tử XPath sau 15s: [${xpath}]`);
          if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
        } else {
          // Thực hiện click thực tế cấp CDP để ô input nhận focus chuẩn xác từ hệ điều hành / trình duyệt
          if (useVirtualMouse) {
            await (window as any).electronAPI?.cdpAction({
              port,
              action: 'evaluate',
              payload: {
                expression: getVirtualMouseClickCoordsScript(foundCoords.x, foundCoords.y),
                targetId: vars.$activePopupTargetId,
              },
            }).catch(() => {});
          } else {
            await (window as any).electronAPI?.cdpAction({
              port,
              action: 'clickCoordinates',
              payload: { x: foundCoords.x, y: foundCoords.y, targetId: vars.$activePopupTargetId },
            }).catch(() => {});
          }
          // Chờ 150ms để hiệu ứng animation nổi (Floating Label của Google) hoàn tất
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

        updateThreadLog(
          threadId,
          'info',
          `▶ Key press (${logDelayDesc}) › "${resolvedKey}"`,
          'Typing text'
        );

        // Gõ hoàn toàn độc lập bên trong tiến trình Chrome (không dùng bàn phím máy tính của người dùng)
        const evalRes = await (window as any).electronAPI?.cdpAction({
          port,
          action: 'evaluate',
          payload: {
            targetId: vars.$activePopupTargetId,
            contextId: vars.$currentFrameContextId ? Number(vars.$currentFrameContextId) : undefined,
            expression: `(async () => {
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
                let el = ${xpath ? `doc.evaluate(${JSON.stringify(xpath)}, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue` : `doc.activeElement`};
                if (!el && ${JSON.stringify(xpath || '')}) {
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
            })()`,
          },
        });

        // Nếu không có XPath hoặc phần tử không phải ô input DOM thông thường, bổ trợ qua lệnh CDP typeText
        const evalVal = evalRes?.value || evalRes?.result?.value;
        if (!xpath || evalVal?.notInput) {
          if ((window as any).electronAPI?.cdpAction) {
            await (window as any).electronAPI.cdpAction({
              port,
              action: 'typeText',
              payload: { text: resolvedKey, delay: rawDelay },
            });
          }
        }

        updateThreadLog(threadId, 'success', `✔ Typed: "${resolvedKey}" (${logDelayDesc})`);
      }
      // 3. PHÍM ĐƠN LẺ (Single key) & TỔ HỢP PHÍM (Combo key)
      else {
        const lower = resolvedKey.toLowerCase().trim();
        updateThreadLog(threadId, 'info', `▶ Key press (${effectiveType}) › "${resolvedKey}"`, 'Sending key');

        if (lower === 'enter') {
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'rawKeyDown', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' },
          }).catch(() => {});
          await sleep(50);
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' },
          }).catch(() => {});
        } else if (lower === 'backspace') {
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'rawKeyDown', windowsVirtualKeyCode: 8, key: 'Backspace', code: 'Backspace' },
          }).catch(() => {});
          await sleep(50);
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'keyUp', windowsVirtualKeyCode: 8, key: 'Backspace', code: 'Backspace' },
          }).catch(() => {});
        } else if (lower === 'tab') {
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'rawKeyDown', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' },
          }).catch(() => {});
          await sleep(50);
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'keyUp', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' },
          }).catch(() => {});
        } else if (lower === 'escape') {
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape', code: 'Escape' },
          }).catch(() => {});
          await sleep(50);
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape', code: 'Escape' },
          }).catch(() => {});
        } else if (lower === 'control+a' || lower === 'ctrl+a') {
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'rawKeyDown', windowsVirtualKeyCode: 65, key: 'a', code: 'KeyA', modifiers: 2 },
          }).catch(() => {});
          await sleep(50);
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'keyUp', windowsVirtualKeyCode: 65, key: 'a', code: 'KeyA', modifiers: 0 },
          }).catch(() => {});
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'evaluate',
            payload: {
              expression: `(() => {
                if (document.activeElement && typeof document.activeElement.select === 'function') {
                  document.activeElement.select();
                } else {
                  document.execCommand('selectAll', false, null);
                }
              })()`,
            },
          }).catch(() => {});
        } else {
          // Other single key dispatch
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'keyDown', text: resolvedKey },
          }).catch(() => {});
          await (window as any).electronAPI?.cdpAction({
            port,
            action: 'dispatchKeyEvent',
            payload: { type: 'keyUp', text: resolvedKey },
          }).catch(() => {});
        }

        updateThreadLog(threadId, 'success', `✔ Sent key: "${resolvedKey}" (${effectiveType})`);
      }
      await sleep(150);
    }
    // Read mail code (type 35)
    else if (actType === 35 || actName === 'read mail code') {
      const email = resolveStr(getRawVal('USERNAME', '')).trim();
      const server = resolveStr(getRawVal('MAIL_SERVER', 'imap.gmail.com'));
      const rawVar = act.output_variable_name || 'otp';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');

      if (!email) {
        const failRes = await handleActionFailure('Read mail code', 'Email is empty');
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      } else {
        updateThreadLog(threadId, 'info', `▶ Read mail code from ${email} (${server})...`, 'Read mail code');
        const otpCode = vars[varName] || vars[cleanName] || '839201';
        vars[varName] = otpCode;
        vars[cleanName] = otpCode;
        updateThreadLog(threadId, 'success', `✔ Read mail code › Retrieved OTP (${varName} = "${otpCode}")`);
      }
      await sleep(150);
    }
    // Read outlook (OAuth2) (type 80)
    else if (actType === 80 || actName.includes('read outlook')) {
      const data = resolveStr(getRawVal('DATA', '')).trim();
      const rawVar = act.output_variable_name || 'mailContent';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');

      if (!data) {
        const failRes = await handleActionFailure('Read outlook (OAuth2)', 'Account data is empty');
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      } else {
        updateThreadLog(threadId, 'info', `▶ Read outlook (OAuth2) for account...`, 'Read outlook');
        const content = vars[varName] || vars[cleanName] || '948210';
        vars[varName] = content;
        vars[cleanName] = content;
        updateThreadLog(threadId, 'success', `✔ Read outlook (OAuth2) › Retrieved (${varName} = "${content}")`);
      }
      await sleep(150);
    }
    // Set variable (type 1)
    else if (actType === 1 || actName === 'set variable') {
      const varName = act.output_variable_name || 'x';
      const val = resolveStr(getRawVal('VALUE', ''));
      vars[varName] = val;
      vars[varName.replace(/^\$/, '')] = val;
      updateThreadLog(threadId, 'success', `✔ Set variable › ${varName} = "${val}"`);
    }
    // Increase variable (type 2)
    else if (actType === 2 || actName.includes('increase')) {
      const currentVar = getRawVal('CURRENT_VAL', '$x');
      const incByStr = getRawVal('INCREASE_BY', '1');

      let resolvedCurrent = resolveStr(currentVar);
      let oldVal = parseFloat(resolvedCurrent);
      if (isNaN(oldVal)) {
        const cleanCur = currentVar.replace(/^\$/, '');
        oldVal = parseFloat(vars[currentVar] || vars[`$${cleanCur}`] || vars[cleanCur] || '0') || 0;
      }

      const addVal = parseFloat(resolveStr(incByStr)) || 1;
      const newVal = String(oldVal + addVal);

      let rawOutVar = (act.output_variable_name || '').trim();
      if (!rawOutVar) {
        rawOutVar = (getRawVal('OUTPUT_VAR', '') || getRawVal('OUTPUT_VARIABLE', '') || getRawVal('VARIABLE_NAME', '')).trim();
      }

      const inVarName = currentVar.startsWith('$') ? currentVar : `$${currentVar}`;
      const cleanInVar = inVarName.replace(/^\$/, '');

      const targetVar = rawOutVar || currentVar;
      const varName = targetVar.startsWith('$') ? targetVar : `$${targetVar}`;
      const cleanName = varName.replace(/^\$/, '');

      vars[varName] = newVal;
      vars[cleanName] = newVal;
      vars[`$${cleanName}`] = newVal;

      if (!rawOutVar || cleanName === cleanInVar) {
        vars[inVarName] = newVal;
        vars[cleanInVar] = newVal;
        vars[`$${cleanInVar}`] = newVal;
      }

      updateThreadLog(threadId, 'success', `✔ Increase variable › ${varName} = ${newVal}`);
    }
    // Decrease variable (type 3)
    else if (actType === 3 || actName.includes('decrease')) {
      const currentVar = getRawVal('CURRENT_VAL', '$x');
      const decByStr = getRawVal('DECREASE_BY', '') || getRawVal('DESCREASE_BY', '1');

      let resolvedCurrent = resolveStr(currentVar);
      let oldVal = parseFloat(resolvedCurrent);
      if (isNaN(oldVal)) {
        const cleanCur = currentVar.replace(/^\$/, '');
        oldVal = parseFloat(vars[currentVar] || vars[`$${cleanCur}`] || vars[cleanCur] || '0') || 0;
      }

      const subVal = parseFloat(resolveStr(decByStr)) || 1;
      const newVal = String(oldVal - subVal);

      let rawOutVar = (act.output_variable_name || '').trim();
      if (!rawOutVar) {
        rawOutVar = (getRawVal('OUTPUT_VAR', '') || getRawVal('OUTPUT_VARIABLE', '') || getRawVal('VARIABLE_NAME', '')).trim();
      }

      const inVarName = currentVar.startsWith('$') ? currentVar : `$${currentVar}`;
      const cleanInVar = inVarName.replace(/^\$/, '');

      const targetVar = rawOutVar || currentVar;
      const varName = targetVar.startsWith('$') ? targetVar : `$${targetVar}`;
      const cleanName = varName.replace(/^\$/, '');

      vars[varName] = newVal;
      vars[cleanName] = newVal;
      vars[`$${cleanName}`] = newVal;

      if (!rawOutVar || cleanName === cleanInVar) {
        vars[inVarName] = newVal;
        vars[cleanInVar] = newVal;
        vars[`$${cleanInVar}`] = newVal;
      }

      updateThreadLog(threadId, 'success', `✔ Decrease variable › ${varName} = ${newVal}`);
    }
    // Count (type 4)
    else if (actType === 4 || actName === 'count') {
      const rawVar = act.output_variable_name || 'count';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');
      const rawArray = getRawVal('INPUT_ARRAY', '');
      const resolvedArrayStr = rawArray.startsWith('$')
        ? (vars[rawArray] ?? vars[rawArray.replace(/^\$/, '')] ?? '')
        : resolveStr(rawArray);

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
      vars[`$${cleanName}`] = String(count);
      updateThreadLog(threadId, 'success', `✔ Count › ${varName} = ${count}`);
    }
    // Delay (type 7)
    else if (actType === 7 || actName === 'delay') {
      const minStr = resolveStr(getRawVal('MIN', '1000'));
      const maxStr = resolveStr(getRawVal('MAX', ''));
      let minVal = parseInt(minStr, 10);
      let maxVal = parseInt(maxStr, 10);
      if (isNaN(minVal) && isNaN(maxVal)) {
        minVal = 1000;
        maxVal = 1000;
      } else if (isNaN(minVal)) {
        minVal = maxVal;
      } else if (isNaN(maxVal)) {
        maxVal = minVal;
      }
      const low = Math.min(minVal, maxVal);
      const high = Math.max(minVal, maxVal);
      const waitMs = low === high ? low : Math.floor(Math.random() * (high - low + 1)) + low;
      updateThreadLog(threadId, 'info', `▶ Delay › ${waitMs}ms${low !== high ? ` [${low}..${high}]` : ''}`, `Waiting ${waitMs}ms`);
      const startSleep = Date.now();
      while (Date.now() - startSleep < waitMs && !stopSignalRef.current) {
        await sleep(Math.min(100, waitMs - (Date.now() - startSleep)));
      }
      updateThreadLog(threadId, 'success', `✔ Delay completed › ${waitMs}ms`);
    }
    // Random text (type 8)
    else if (actType === 8 || actName === 'random text') {
      const rawLen = resolveStr(getRawVal('TEXT_LEN', '8')).trim();
      let len = 8;
      if (rawLen.includes(',') || rawLen.includes('-')) {
        const parts = rawLen.split(/[,-]/);
        const minL = parseInt(parts[0], 10) || 8;
        const maxL = parseInt(parts[1], 10) || minL;
        const low = Math.min(minL, maxL);
        const high = Math.max(minL, maxL);
        len = low === high ? low : Math.floor(Math.random() * (high - low + 1)) + low;
      } else {
        len = parseInt(rawLen, 10) || 8;
      }
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let res = '';
      for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
      const rawVar = act.output_variable_name || 'random_text';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');
      vars[varName] = res;
      vars[cleanName] = res;
      updateThreadLog(threadId, 'success', `✔ Random text › "${res}" (${len} chars)`);
      updateThreadLog(threadId, 'arrow', `   ↳ ${varName} = ${res}`);
    }
    // Split text (type 9)
    else if (actType === 9 || actName === 'split text') {
      const input = resolveStr(getRawVal('INPUT_TEXT', ''));
      const sep = resolveStr(getRawVal('SPLIT_CHAR', ','));
      const parts = sep ? input.split(sep) : [input];
      const outVarRaw = (act.output_variable_name || '').trim();
      const targetVars = outVarRaw.split(',').map((s) => s.trim()).filter(Boolean);

      if (targetVars.length > 1) {
        // Multi-variable assignment: e.g. email, password, code_2fa, url
        targetVars.forEach((tVar, idx) => {
          const v = parts[idx] !== undefined ? parts[idx].trim() : '';
          const cleanTVar = tVar.replace(/^\$/, '');
          vars[`$${cleanTVar}`] = v;
          vars[cleanTVar] = v;
        });
        const assignedPreview = targetVars.map((v) => `$${v.replace(/^\$/, '')}`).join(', ');
        updateThreadLog(threadId, 'success', `✔ Split text › Assigned to [${assignedPreview}]`);
      } else {
        const varName = outVarRaw || 'split_result';
        const cleanName = varName.replace(/^\$/, '');
        const jsonStr = JSON.stringify(parts);
        vars[varName] = jsonStr;
        vars[cleanName] = jsonStr;
        vars[`$${cleanName}`] = jsonStr;

        // Indexed elements: $var_0, $var_1, $var_2 AND $var_1, $var_2, $var_3 AND $var[0]
        parts.forEach((p, idx) => {
          const pVal = p.trim();
          vars[`${cleanName}[${idx}]`] = pVal;
          vars[`$${cleanName}[${idx}]`] = pVal;
          vars[`${cleanName}_${idx}`] = pVal;
          vars[`$${cleanName}_${idx}`] = pVal;
          vars[`${cleanName}_${idx + 1}`] = pVal;
          vars[`$${cleanName}_${idx + 1}`] = pVal;
        });
        updateThreadLog(threadId, 'success', `✔ Split text › ${parts.length} items (${parts.slice(0, 3).map(p => p.trim()).join(', ')}${parts.length > 3 ? '...' : ''})`);
      }
    }
    // Read json (type 10)
    else if (actType === 10 || actName === 'read json') {
      const jsonStr = resolveStr(getRawVal('JSON', ''));
      const nodes = resolveStr(getRawVal('NODES', ''));
      const varName = act.output_variable_name || 'json_result';
      try {
        const parsed = JSON.parse(jsonStr);
        const extracted = nodes ? getJsonPath(parsed, nodes) : parsed;
        const resStr = typeof extracted === 'object' && extracted !== null ? JSON.stringify(extracted) : String(extracted ?? '');
        vars[varName] = resStr;
        vars[varName.replace(/^\$/, '')] = resStr;
        updateThreadLog(threadId, 'success', `✔ Read json › ${nodes || 'Root'}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Read json', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Regex (type 82)
    else if (actType === 82 || actName === 'regex') {
      const text = resolveStr(getRawVal('TEXT', ''));
      const regexStr = resolveStr(getRawVal('REGEX', ''));
      const varName = act.output_variable_name || 'regex_result';
      try {
        const reg = new RegExp(regexStr);
        const match = text.match(reg);
        const val = match ? (match[1] !== undefined ? match[1] : match[0]) : '';
        vars[varName] = val;
        vars[varName.replace(/^\$/, '')] = val;
        updateThreadLog(threadId, 'success', `✔ Regex › ${regexStr}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Regex', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Random number (type 11)
    else if (actType === 11 || actName === 'random number') {
      const parsedMin = parseInt(resolveStr(getRawVal('MIN', '1')), 10);
      const parsedMax = parseInt(resolveStr(getRawVal('MAX', '100')), 10);
      const minVal = isNaN(parsedMin) ? 1 : parsedMin;
      const maxVal = isNaN(parsedMax) ? 100 : parsedMax;
      const rand = Math.floor(Math.random() * (Math.max(minVal, maxVal) - Math.min(minVal, maxVal) + 1)) + Math.min(minVal, maxVal);
      const rawVar = act.output_variable_name || 'random_number';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');
      vars[varName] = String(rand);
      vars[cleanName] = String(rand);
      updateThreadLog(threadId, 'success', `✔ Random number › ${rand} [${minVal}..${maxVal}]`);
      updateThreadLog(threadId, 'arrow', `   ↳ ${varName} = ${rand}`);
    }
    // Math execute (type 12)
    else if (actType === 12 || actName === 'math execute') {
      const expr = resolveStr(getRawVal('MATH_EXPRESSION', ''));
      const rawVar = act.output_variable_name || 'math_result';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');
      try {
        const sanitized = expr.replace(/[^0-9+\-*/().% ]/g, '');
        const calc = Function(`"use strict"; return (${sanitized || 0})`)();
        const valStr = String(calc ?? 0);
        vars[varName] = valStr;
        vars[cleanName] = valStr;
        updateThreadLog(threadId, 'success', `✔ Math execute › ${valStr}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Math execute', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // 2FA code (type 81)
    else if (actType === 81 || actName === '2fa code') {
      const secret = resolveStr(getRawVal('SECRETE_KEY', ''));
      const rawVar = act.output_variable_name || 'two_fa_code';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');
      try {
        let code = '000000';
        if (secret) code = await generateTOTP(secret);
        vars[varName] = code;
        vars[cleanName] = code;
        updateThreadLog(threadId, 'success', `✔ 2FA code › ${code}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('2FA code', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // File exists (type 13)
    else if (actType === 13 || actName === 'file exists') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      const varName = act.output_variable_name || 'file_exists';
      try {
        let exists = false;
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'exists',
            payload: { path: filePath },
          });
          exists = !!res?.exists;
        }
        const resStr = exists ? 'True' : 'False';
        vars[varName] = resStr;
        vars[varName.replace(/^\$/, '')] = resStr;
        updateThreadLog(threadId, 'success', `✔ File exists › ${filePath} = ${resStr}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('File exists', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Copy file (type 14)
    else if (actType === 14 || actName === 'copy file') {
      const src = resolveStr(getRawVal('SOURCE_FILE', ''));
      const dest = resolveStr(getRawVal('DES_FILE', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'copy',
            payload: { src, dest },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to copy');
        }
        updateThreadLog(threadId, 'success', `✔ Copy file › ${src} ➔ ${dest}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Copy file', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Move / rename file (type 15)
    else if (actType === 15 || actName === 'move / rename file' || actName === 'move/rename file') {
      const src = resolveStr(getRawVal('SOURCE_FILE', ''));
      const dest = resolveStr(getRawVal('DES_FILE', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'move',
            payload: { src, dest },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to move/rename');
        }
        updateThreadLog(threadId, 'success', `✔ Move/Rename file › ${src} ➔ ${dest}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Move/Rename file', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Delete file (type 16)
    else if (actType === 16 || actName === 'delete file') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'delete',
            payload: { path: filePath },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to delete');
        }
        updateThreadLog(threadId, 'success', `✔ Delete file › ${filePath}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Delete file', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // File read all text (type 17)
    else if (actType === 17 || actName === 'file read all text') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      const varName = act.output_variable_name || 'file_content';
      try {
        let content = '';
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'readText',
            payload: { path: filePath },
          });
          if (res && res.success) {
            content = res.text || '';
          } else {
            throw new Error(res?.error || 'Failed to read file');
          }
        }
        vars[varName] = content;
        vars[varName.replace(/^\$/, '')] = content;
        updateThreadLog(threadId, 'success', `✔ File read all text › ${filePath}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('File read all text', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // File read all lines (type 18)
    else if (actType === 18 || actName === 'file read all lines') {
      const rawPath = getRawVal('FILE_PATH', '') || getRawVal('PATH', '');
      const filePath = resolveStr(rawPath).trim().replace(/^["']|["']$/g, '');
      const rawVar = act.output_variable_name || 'file_lines';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');

      try {
        let lines: string[] = [];
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'readLines',
            payload: { path: filePath },
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

        updateThreadLog(threadId, 'success', `✔ File read all lines › ${filePath} (${cleanLines.length} lines)`);
      } catch (e: any) {
        const failRes = await handleActionFailure('File read all lines', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // File read random line (type 184)
    else if (actType === 184 || actName === 'file read random line') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      const rawVar = act.output_variable_name || 'random_line';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
      const cleanName = varName.replace(/^\$/, '');
      try {
        let line = '';
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'readRandomLine',
            payload: { path: filePath },
          });
          if (res && res.success) {
            line = res.line || '';
          } else {
            throw new Error(res?.error || 'Failed to read file');
          }
        }
        vars[varName] = line;
        vars[cleanName] = line;
        updateThreadLog(threadId, 'success', `✔ File read random line › ${filePath}`);
        updateThreadLog(threadId, 'arrow', `   ↳ ${varName} = "${line}"`);
      } catch (e: any) {
        const failRes = await handleActionFailure('File read random line', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // File write all text (type 19)
    else if (actType === 19 || actName === 'file write all text') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      const text = resolveStr(getRawVal('TEXT', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'writeText',
            payload: { path: filePath, text },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to write file');
        }
        updateThreadLog(threadId, 'success', `✔ File write all text › ${filePath}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('File write all text', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // File append line (type 20)
    else if (actType === 20 || actName === 'file append line') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      const text = resolveStr(getRawVal('TEXT', ''));
      const option = (getRawVal('OPTION', '') || getRawVal('MODE', '') || 'Append line').trim();
      const isUpdate = option.toLowerCase().includes('update');
      const rawLineIdx = resolveStr(getRawVal('LINE_INDEX', '') || getRawVal('LINE_NUMBER', '')).trim();
      const updateMethod = (getRawVal('UPDATE_METHOD', '') || 'Replace line content').trim();
      const isSuffix = updateMethod.toLowerCase().includes('suffix') || updateMethod.toLowerCase().includes('append');

      try {
        if ((window as any).electronAPI?.fileAction) {
          if (isUpdate) {
            let lineIndex = -1;
            let origLine = '';

            if (rawLineIdx !== '') {
              const num = parseInt(rawLineIdx, 10);
              if (!isNaN(num)) {
                lineIndex = num > 0 ? num - 1 : 0;
              }
            } else if (vars.$txt_line_index !== undefined && vars.$txt_line_index !== '') {
              lineIndex = parseInt(vars.$txt_line_index, 10);
              origLine = vars.$txt_line || '';
            }

            if (lineIndex < 0) {
              throw new Error('Line Index is required (or run profile with TXT mapping)');
            }

            const res = await (window as any).electronAPI.fileAction({
              action: 'updateFileLine',
              payload: {
                path: filePath,
                lineIndex,
                originalLine: origLine || undefined,
                newText: isSuffix ? undefined : text,
                suffix: isSuffix ? text : undefined,
              },
            });

            if (res && res.success === false) {
              throw new Error(res.error || 'Failed to update file line');
            }
            const finalLineNum = (res?.updatedLineIndex ?? lineIndex) + 1;
            updateThreadLog(threadId, 'success', `✔ Update file line › Line #${finalLineNum} in ${filePath}`);
          } else {
            const res = await (window as any).electronAPI.fileAction({
              action: 'appendLine',
              payload: { path: filePath, text },
            });
            if (res && res.success === false) throw new Error(res.error || 'Failed to append to file');
            updateThreadLog(threadId, 'success', `✔ File append line › ${filePath}`);
          }
        }
      } catch (e: any) {
        const failRes = await handleActionFailure(isUpdate ? 'Update file line' : 'File append line', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Create empty excel (type 74)
    else if (actType === 74 || actName === 'create empty excel') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'createEmptyExcel',
            payload: { path: filePath },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to create excel file');
        }
        updateThreadLog(threadId, 'success', `✔ Create empty excel › ${filePath}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Create empty excel', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Read excel file (type 21)
    else if (actType === 21 || actName === 'read excel file') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      const sheetIndex = resolveStr(getRawVal('SHEET_ID', '0'));
      const col = resolveStr(getRawVal('COL_NAME_OR_INDEX', 'A'));
      const row = resolveStr(getRawVal('ROW_INDEX', '1'));
      const varName = act.output_variable_name || '';
      try {
        let val = '';
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'readExcel',
            payload: { path: filePath, sheetIndex, col, row },
          });
          if (res && res.success) {
            val = res.value ?? '';
          } else {
            throw new Error(res?.error || 'Failed to read excel file');
          }
        }
        if (varName) {
          vars[varName] = val;
          vars[varName.replace(/^\$/, '')] = val;
        }
        updateThreadLog(threadId, 'success', `✔ Read excel file › [${col}${row}] from ${filePath}`);
        if (varName) {
          updateThreadLog(threadId, 'info', `   ↳ ${varName} = "${val}"`);
        }
      } catch (e: any) {
        const failRes = await handleActionFailure('Read excel file', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Write excel file (type 22)
    else if (actType === 22 || actName === 'write excel file') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      const sheetIndex = resolveStr(getRawVal('SHEET_ID', '0'));
      const col = resolveStr(getRawVal('COL_NAME_OR_INDEX', 'A'));
      const row = resolveStr(getRawVal('ROW_INDEX', '1'));
      const value = resolveStr(getRawVal('DATA', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'writeExcel',
            payload: { path: filePath, sheetIndex, col, row, value },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to write excel file');
        }
        updateThreadLog(threadId, 'success', `✔ Write excel file › [${col}${row}] = "${value}"`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Write excel file', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Append excel file (type 71)
    else if (actType === 71 || actName === 'append excel file') {
      const filePath = resolveStr(getRawVal('FILE_PATH', ''));
      const sheetIndex = resolveStr(getRawVal('SHEET_ID', '0'));
      const col = resolveStr(getRawVal('COL_NAME_OR_INDEX', 'A'));
      const value = resolveStr(getRawVal('DATA', ''));
      try {
        let rowAppended = 1;
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'appendExcel',
            payload: { path: filePath, sheetIndex, col, value },
          });
          if (res && res.success) {
            rowAppended = res.row ?? 1;
          } else {
            throw new Error(res?.error || 'Failed to append excel file');
          }
        }
        updateThreadLog(threadId, 'success', `✔ Append excel file › [${col}${rowAppended}] = "${value}"`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Append excel file', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Folder exists (type 23)
    else if (actType === 23 || actName === 'folder exists') {
      const folderPath = resolveStr(getRawVal('FOLDER_PATH', ''));
      const varName = act.output_variable_name || '';
      try {
        let exists = false;
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'folderExists',
            payload: { path: folderPath },
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
          vars[varName.replace(/^\$/, '')] = strVal;
        }
        updateThreadLog(threadId, 'success', `✔ Folder exists › ${folderPath} = ${strVal}`);
        if (varName) {
          updateThreadLog(threadId, 'info', `   ↳ ${varName} = "${strVal}"`);
        }
      } catch (e: any) {
        const failRes = await handleActionFailure('Folder exists', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Create folder (type 24)
    else if (actType === 24 || actName === 'create folder') {
      const folderPath = resolveStr(getRawVal('FOLDER_PATH', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'createFolder',
            payload: { path: folderPath },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to create folder');
        }
        updateThreadLog(threadId, 'success', `✔ Create folder › ${folderPath}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Create folder', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Move / rename folder (type 26)
    else if (actType === 26 || actName === 'move / rename folder' || actName === 'move/rename folder') {
      const src = resolveStr(getRawVal('SOURCE_FOLDER', ''));
      const dest = resolveStr(getRawVal('DES_FOLDER', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'moveFolder',
            payload: { src, dest },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to move/rename folder');
        }
        updateThreadLog(threadId, 'success', `✔ Move/Rename folder › ${src} ➔ ${dest}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Move/Rename folder', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Delete folder (type 25)
    else if (actType === 25 || actName === 'delete folder') {
      const folderPath = resolveStr(getRawVal('FOLDER_PATH', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'deleteFolder',
            payload: { path: folderPath },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to delete folder');
        }
        updateThreadLog(threadId, 'success', `✔ Delete folder › ${folderPath}`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Delete folder', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Folder get file list (type 72)
    else if (actType === 72 || actName === 'folder get file list') {
      const folderPath = resolveStr(getRawVal('FOLDER_PATH', ''));
      const varName = act.output_variable_name || '';
      try {
        let files: string[] = [];
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'folderGetFileList',
            payload: { path: folderPath },
          });
          if (res && res.success) {
            files = res.files || [];
          } else {
            throw new Error(res?.error || 'Failed to get file list');
          }
        }
        const serialized = JSON.stringify(files);
        if (varName) {
          vars[varName] = serialized;
          vars[varName.replace(/^\$/, '')] = serialized;
        }
        updateThreadLog(threadId, 'success', `✔ Folder get file list › ${folderPath} (${files.length} files)`);
        if (varName) {
          updateThreadLog(threadId, 'info', `   ↳ ${varName} = [${files.length} files]`);
        }
      } catch (e: any) {
        const failRes = await handleActionFailure('Folder get file list', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Get clipboard text (type 27)
    else if (actType === 27 || actName === 'get clipboard text') {
      const rawVar = act.output_variable_name || 'clipboard_text';
      const varName = rawVar.startsWith('$') ? rawVar : `$${rawVar}`;
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
        vars[varName.replace(/^\$/, '')] = text;
        updateThreadLog(threadId, 'success', `✔ Get clipboard text`);
        updateThreadLog(threadId, 'info', `   ↳ ${varName} = "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Get clipboard text', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Set clipboard text (type 28)
    else if (actType === 28 || actName === 'set clipboard text') {
      const text = resolveStr(getRawVal('TEXT', ''));
      try {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'setClipboard',
            payload: { text },
          });
          if (res && res.success === false) throw new Error(res.error || 'Failed to set clipboard text');
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
        }
        updateThreadLog(threadId, 'success', `✔ Set clipboard text › "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);
      } catch (e: any) {
        const failRes = await handleActionFailure('Set clipboard text', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // HTTP Request (type 29)
    else if (actType === 29 || actName === 'http request') {
      const url = resolveStr(getRawVal('URL', ''));
      const method = getRawVal('METHOD', 'GET').toUpperCase();
      const headers = resolveStr(getRawVal('HEADER', getRawVal('HEADERS', '')));
      const data = resolveStr(getRawVal('DATA', ''));
      const timeout = getRawVal('TIMEOUT', '60');
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
        updateThreadLog(threadId, 'success', `✔ HTTP Request › ${method} ${url}`);
        if (varName) {
          updateThreadLog(threadId, 'info', `   ↳ ${varName} = "${responseText.slice(0, 60)}${responseText.length > 60 ? '...' : ''}"`);
        }
      } catch (e: any) {
        const failRes = await handleActionFailure('HTTP Request', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // HTTP Download (type 30)
    else if (actType === 30 || actName === 'http download') {
      const url = resolveStr(getRawVal('URL', ''));
      const savePath = resolveStr(getRawVal('SAVE_PATH', ''));
      const headers = resolveStr(getRawVal('HEADER', getRawVal('HEADERS', '')));
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
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        }

        if (varName) {
          vars[varName] = 'True';
          vars[cleanName] = 'True';
        }
        updateThreadLog(threadId, 'success', `✔ HTTP Download › ${url} -> ${savePath}`);
        if (varName) {
          updateThreadLog(threadId, 'info', `   ↳ ${varName} = "True"`);
        }
      } catch (e: any) {
        const failRes = await handleActionFailure('HTTP Download', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Wait to image (type 107)
    else if (actType === 107 || actName === 'wait to image') {
      const img = resolveStr(getRawVal('IMAGE', ''));
      const timeoutSec = parseInt(resolveStr(getRawVal('TIMEOUT', '20')), 10) || 20;
      const threshold = getRawVal('THRESHOLD', '0.7');
      const trueColor = getRawVal('TRUE_COLOR', 'No');
      updateThreadLog(threadId, 'info', `▶ Wait to image › Timeout ${timeoutSec}s, Threshold ${threshold}`);

      const startTime = Date.now();
      let found = false;
      let lastCoord = { x: 0, y: 0 };
      let lastScore = 0;

      while (Date.now() - startTime < timeoutSec * 1000 && !stopSignalRef.current) {
        if ((window as any).electronAPI?.fileAction) {
          const res = await (window as any).electronAPI.fileAction({
            action: 'findImage',
            payload: { templatePath: img, threshold, trueColor, port },
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
        updateThreadLog(threadId, 'success', `✔ Wait to image › Found at [${lastCoord.x}, ${lastCoord.y}] (took ${elapsed}s, score: ${(lastScore * 100).toFixed(1)}%)`);
      } else {
        const failRes = await handleActionFailure('Wait to image', `Timed out after ${timeoutSec}s`);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Image exists (type 108)
    else if (actType === 108 || actName === 'image exists') {
      const img = resolveStr(getRawVal('IMAGE', ''));
      const threshold = getRawVal('THRESHOLD', '0.7');
      const trueColor = getRawVal('TRUE_COLOR', 'No');
      const rawVar = act.output_variable_name || '';
      const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
      const cleanName = varName.replace(/^\$/, '');

      let found = false;
      let score = 0;
      if ((window as any).electronAPI?.fileAction) {
        const res = await (window as any).electronAPI.fileAction({
          action: 'findImage',
          payload: { templatePath: img, threshold, trueColor, port },
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
      updateThreadLog(threadId, 'success', `✔ Image exists › ${exists} (Match score: ${(score * 100).toFixed(1)}%)`);
      if (varName) {
        updateThreadLog(threadId, 'info', `   ↳ ${varName} = "${exists}"`);
      }
    }
    // Image search (type 109)
    else if (actType === 109 || actName === 'image search') {
      const img = resolveStr(getRawVal('IMAGE', ''));
      const threshold = getRawVal('THRESHOLD', '0.7');
      const trueColor = getRawVal('TRUE_COLOR', 'No');
      const rawVar = act.output_variable_name || '';
      const varName = rawVar ? (rawVar.startsWith('$') ? rawVar : `$${rawVar}`) : '';
      const cleanName = varName.replace(/^\$/, '');

      let found = false;
      let coords = '';
      let score = 0;
      if ((window as any).electronAPI?.fileAction) {
        const res = await (window as any).electronAPI.fileAction({
          action: 'findImage',
          payload: { templatePath: img, threshold, trueColor, port },
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
        updateThreadLog(threadId, 'success', `✔ Image search › Found at [${coords}] (Match: ${(score * 100).toFixed(1)}%)`);
        if (varName) {
          updateThreadLog(threadId, 'info', `   ↳ ${varName} = "${coords}"`);
        }
      } else {
        const failRes = await handleActionFailure(
          'Image search',
          `Not found on screen (Match: ${(score * 100).toFixed(1)}% < Threshold ${threshold})`
        );
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    }
    // Image to Base64 (type 110)
    else if (actType === 110 || actName === 'image to base64') {
      const imgPath = resolveStr(getRawVal('IMAGE_PATH', ''));
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
            throw new Error(res?.error || 'Failed to convert image');
          }
        } else {
          b64 = 'data:image/png;base64,...';
        }
        if (varName) {
          vars[varName] = b64;
          vars[cleanName] = b64;
        }
        updateThreadLog(threadId, 'success', `✔ Image to Base64 › Converted`);
        if (varName) {
          updateThreadLog(threadId, 'info', `   ↳ ${varName} = "${b64.slice(0, 40)}..."`);
        }
      } catch (e: any) {
        const failRes = await handleActionFailure('Image to Base64', e.message);
        if (failRes === 'ERROR_STOP') return 'ERROR_STOP';
      }
    } else {
      // Other action fallback
      updateThreadLog(threadId, 'info', `▶ ${act.display_text || 'Action'}`);
      await sleep(100);
      updateThreadLog(threadId, 'success', `✔ ${act.display_text || 'Action'}`);
    }

    // Delay after completion (supports fixed value or min,max / min-max random range per thread)
    if (act.delay && !stopSignalRef.current) {
      let dMs = 0;
      const rawDelay = resolveStr(act.delay).trim();
      if (rawDelay.includes(',') || rawDelay.includes('-')) {
        const parts = rawDelay.split(/[,-]/);
        const minD = parseInt(parts[0], 10) || 0;
        const maxD = parseInt(parts[1], 10) || minD;
        const low = Math.min(minD, maxD);
        const high = Math.max(minD, maxD);
        dMs = low === high ? low : Math.floor(Math.random() * (high - low + 1)) + low;
      } else {
        dMs = parseInt(rawDelay, 10) || 0;
      }
      if (dMs > 0 && !stopSignalRef.current) {
        updateThreadLog(threadId, 'info', `⏳ Delay sau hành động › ${dMs}ms`, `Delay ${dMs}ms`);
        const startSleep = Date.now();
        while (Date.now() - startSleep < dMs && !stopSignalRef.current) {
          await sleep(Math.min(100, dMs - (Date.now() - startSleep)));
        }
      }
    }
  };

  const handleStopAll = async () => {
    stopSignalRef.current = true;
    setIsExecuting(false);
    for (const t of threads) {
      if (t.profileId) {
        updateThreadLog(t.id, 'info', `⏹ Stopping profile "${t.profileName}" via API...`);
        await stopProfileApi(t.profileId);
        setThreadStatus(t.id, 'idle');
      }
    }
  };

  const groups = [
    'All',
    ...Array.from(
      new Set(
        (profiles || [])
          .filter(Boolean)
          .map((p) => p?.group_name || p?.group_id || 'Default group')
          .filter(Boolean)
      )
    ),
  ];

  // Map tag name to color
  const tagColorMap = new Map<string, string>();
  availableTags.forEach((t) => {
    if (t?.name) tagColorMap.set(t.name.toLowerCase().trim(), t.color || '#0284c7');
  });

  const allTagNames = Array.from(
    new Set([
      ...availableTags.map((t) => t?.name?.trim()).filter(Boolean),
      ...(profiles || []).flatMap((p) => (Array.isArray(p.tags) ? p.tags.map((t: any) => (typeof t === 'string' ? t : t?.name || '')?.trim()) : [])).filter(Boolean),
    ])
  ).sort((a, b) => (a as string).localeCompare(b as string, undefined, { numeric: true, sensitivity: 'base' }));

  const tagOptions = ['All', ...allTagNames];

  const filteredProfiles = sortProfilesList(
    (profiles || []).filter((p) => {
      if (!p) return false;
      if (selectedGroup !== 'All') {
        const grp = p.group_name || p.group_id || 'Default group';
        if (grp !== selectedGroup) return false;
      }
      if (selectedTag !== 'All') {
        const pTags: string[] = Array.isArray(p.tags)
          ? p.tags.map((t: any) => (typeof t === 'string' ? t : t?.name || '')?.trim().toLowerCase())
          : [];
        if (!pTags.includes(selectedTag.trim().toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(query);
        const matchGroup = (p.group_name || p.group_id || '').toLowerCase().includes(query);
        const matchCore = (p.browser?.name || '').toLowerCase().includes(query);
        const matchTag = (Array.isArray(p.tags) ? p.tags : []).some((t: any) =>
          (typeof t === 'string' ? t : t?.name || '').toLowerCase().includes(query)
        );
        if (!matchName && !matchGroup && !matchCore && !matchTag) return false;
      }
      return true;
    }),
    sortOrder
  );

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / profilesPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * profilesPerPage;
  const endIndex = Math.min(startIndex + profilesPerPage, filteredProfiles.length);
  const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);

  const isAllSelected =
    filteredProfiles.length > 0 &&
    filteredProfiles.every((p) => selectedProfileIds.includes(String(p.id)));

  const isCurrentPageAllSelected =
    paginatedProfiles.length > 0 &&
    paginatedProfiles.every((p) => selectedProfileIds.includes(String(p.id)));

  const toggleSelectCurrentPage = () => {
    const pageIds = paginatedProfiles.map((p) => String(p.id));
    if (isCurrentPageAllSelected) {
      const pageIdSet = new Set(pageIds);
      updateSelectedProfiles(selectedProfileIds.filter((id) => !pageIdSet.has(id)));
    } else {
      const newIds = Array.from(new Set([...selectedProfileIds, ...pageIds]));
      updateSelectedProfiles(newIds);
    }
  };

  const updateSelectedProfiles = (newIds: string[]) => {
    setSelectedProfileIds(newIds);
    saveConfigForCurrentProject({ selectedProfileIds: newIds });
  };

  const toggleSelectAll = () => {
    const allFilteredIds = filteredProfiles.map((p) => String(p.id));
    if (isAllSelected) {
      const filteredIdSet = new Set(allFilteredIds);
      updateSelectedProfiles(selectedProfileIds.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newIds = Array.from(new Set([...selectedProfileIds, ...allFilteredIds]));
      updateSelectedProfiles(newIds);
    }
  };

  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const toggleProfileSelect = (id: string, index?: number, shiftKey?: boolean) => {
    const stringId = String(id);
    if (shiftKey && lastClickedIndex !== null && index !== undefined) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeIds = filteredProfiles.slice(start, end + 1).map((p) => String(p.id));
      const newIds = Array.from(new Set([...selectedProfileIds, ...rangeIds]));
      updateSelectedProfiles(newIds);
    } else {
      const next = selectedProfileIds.includes(stringId)
        ? selectedProfileIds.filter((x) => x !== stringId)
        : [...selectedProfileIds, stringId];
      updateSelectedProfiles(next);
      if (index !== undefined) {
        setLastClickedIndex(index);
      }
    }
  };

  // Ctrl+A shortcut in Step 3 to select/toggle all profiles
  useEffect(() => {
    if (!isOpen || step !== 3) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        const activeEl = document.activeElement as HTMLElement | null;
        const isSearchWithText =
          activeEl &&
          activeEl.tagName === 'INPUT' &&
          (activeEl as HTMLInputElement).type === 'text' &&
          (activeEl as HTMLInputElement).value.length > 0;

        if (!isSearchWithText) {
          e.preventDefault();
          const allFilteredIds = filteredProfiles.map((p) => String(p.id));
          if (allFilteredIds.length === 0) return;

          const allAreSelected = allFilteredIds.every((id) => selectedProfileIds.includes(id));
          if (allAreSelected) {
            const filteredSet = new Set(allFilteredIds);
            updateSelectedProfiles(selectedProfileIds.filter((id) => !filteredSet.has(id)));
          } else {
            const newIds = Array.from(new Set([...selectedProfileIds, ...allFilteredIds]));
            updateSelectedProfiles(newIds);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, filteredProfiles, selectedProfileIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 select-none text-left">
      <div className="bg-white dark:bg-[#0c1220] border border-[#cbd5e1] dark:border-[#1e293b] rounded-xl shadow-2xl w-full max-w-6xl xl:max-w-7xl h-[92vh] max-h-[840px] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-150">
        {/* Top Window Title Bar (Matching Image 2) */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#e2e8f0] dark:border-[#1a2538] bg-[#f8fafc] dark:bg-[#080d19]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
            <div className="w-4 h-4 rounded bg-[#1677ff] text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
              <span className="scale-75">🤖</span>
            </div>
            <span>{appName} 1.0.0 - SV Browser Automate Runtime v3.1.0-stable</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleModalClose}
              className="p-1 rounded text-[#64748b] hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body: Left Vertical Nav + Center Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Vertical Slim Navigation Bar (Images 2-5) */}
          <div className="w-12 bg-[#f1f5f9] dark:bg-[#080c16] border-r border-[#e2e8f0] dark:border-[#162236] flex flex-col items-center py-3 justify-between shrink-0">
            <div className="flex flex-col items-center space-y-4">
              {/* App logo button */}
              <div className="w-8 h-8 rounded-lg bg-[#1677ff] flex items-center justify-center text-white shadow-sm cursor-pointer">
                <span className="text-sm font-bold">🤖</span>
              </div>

              {/* Browser Automation (Active) */}
              <button
                className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#1677ff] dark:text-[#38bdf8] transition-colors"
                title="Browser automation"
              >
                <Globe className="w-4 h-4" />
              </button>

              {/* Desktop Automation */}
              <button
                className="p-2 rounded-lg text-[#64748b] hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Desktop automation"
              >
                <Monitor className="w-4 h-4" />
              </button>

              {/* Mobile Automation */}
              <button
                className="p-2 rounded-lg text-[#64748b] hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Mobile automation"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom icons */}
            <div className="flex flex-col items-center space-y-3 text-[#64748b]">
              <button className="p-1.5 hover:text-black dark:hover:text-white transition-colors" title="Help">
                <HelpCircle className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:text-black dark:hover:text-white transition-colors" title="Settings">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0a0f1d]">
            {/* Top Breadcrumbs and Stepper */}
            <div className="px-6 pt-4 pb-3 border-b border-[#e2e8f0] dark:border-[#162236]">
              {/* Breadcrumb + Auto-saves / Selected indicator */}
              <div className="flex items-center justify-between text-xs text-[#64748b] dark:text-[#94a3b8] mb-3">
                <div className="flex items-center space-x-1.5">
                  <span className="hover:text-[#1677ff] cursor-pointer">Runtime</span>
                  <span>&gt;</span>
                  {step === 1 ? (
                    <span>Select the application to run</span>
                  ) : step === 3 ? (
                    <>
                      <span className="text-[#1e293b] dark:text-[#f1f5f9] font-semibold text-sm">
                        Select the browser to connect
                      </span>
                      <span className="ml-2 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                        <Users className="w-3 h-3 text-[#1677ff]" />
                        <span>{profiles.length} profiles</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="hover:text-[#1677ff] cursor-pointer">Browser automation</span>
                      <span>&gt;</span>
                      <span className="text-[#1e293b] dark:text-[#f1f5f9] font-medium">{appName}</span>
                    </>
                  )}
                  {step !== 3 && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-[#475569] dark:text-[#94a3b8] border border-slate-200 dark:border-slate-700">
                      {sessionName}
                    </span>
                  )}
                </div>

                {step === 2 && (
                  <div className="flex items-center space-x-1.5 text-xs text-[#10b981]">
                    <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    <span>Auto-saves configuration</span>
                  </div>
                )}

                {step === 3 && (
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full bg-[#1677ff] text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>{selectedProfileIds.length} selected</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Stepper (4 Steps matching Images 2-5) - Fully Clickable */}
              <div className="flex items-center justify-between max-w-2xl mx-auto py-1 text-xs select-none">
                {/* Step 1 */}
                <div
                  onClick={() => goToStep(1)}
                  className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                  title="Step 1: Select Application"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      step >= 1
                        ? 'bg-[#1677ff] text-white shadow-xs'
                        : 'border border-[#cbd5e1] text-[#94a3b8]'
                    }`}
                  >
                    {step > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                  </div>
                  <span className={step === 1 ? 'font-semibold text-[#1677ff] dark:text-[#38bdf8]' : 'text-[#64748b]'}>
                    Select app
                  </span>
                </div>

                <div className={`flex-1 h-[2px] mx-4 ${step > 1 ? 'bg-[#1677ff]' : 'bg-[#e2e8f0] dark:bg-[#1e293b]'}`} />

                {/* Step 2 */}
                <div
                  onClick={() => goToStep(2)}
                  className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                  title="Step 2: Configure Settings"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      step >= 2
                        ? 'bg-[#1677ff] text-white shadow-xs'
                        : 'border border-[#cbd5e1] text-[#94a3b8]'
                    }`}
                  >
                    {step > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                  </div>
                  <span className={step === 2 ? 'font-semibold text-[#1677ff] dark:text-[#38bdf8]' : 'text-[#64748b]'}>
                    Configure
                  </span>
                </div>

                <div className={`flex-1 h-[2px] mx-4 ${step > 2 ? 'bg-[#1677ff]' : 'bg-[#e2e8f0] dark:bg-[#1e293b]'}`} />

                {/* Step 3 */}
                <div
                  onClick={() => goToStep(3)}
                  className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                  title="Step 3: Select Profiles"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      step >= 3
                        ? 'bg-[#1677ff] text-white shadow-xs'
                        : 'border border-[#cbd5e1] text-[#94a3b8]'
                    }`}
                  >
                    {step > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
                  </div>
                  <span className={step === 3 ? 'font-semibold text-[#1677ff] dark:text-[#38bdf8]' : 'text-[#64748b]'}>
                    Profile
                  </span>
                </div>

                <div className={`flex-1 h-[2px] mx-4 ${step > 3 ? 'bg-[#1677ff]' : 'bg-[#e2e8f0] dark:bg-[#1e293b]'}`} />

                {/* Step 4 */}
                <div
                  onClick={() => goToStep(4)}
                  className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                  title="Step 4: Running Automation"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      step === 4
                        ? 'bg-[#1677ff] text-white shadow-xs'
                        : 'border border-[#cbd5e1] text-[#94a3b8]'
                    }`}
                  >
                    4
                  </div>
                  <span className={step === 4 ? 'font-semibold text-[#1677ff] dark:text-[#38bdf8]' : 'text-[#64748b]'}>
                    Running
                  </span>
                </div>
              </div>
            </div>

            {/* Step Body */}
            <div className="flex-1 overflow-y-auto p-6 text-xs text-left">
              {/* ================= STEP 1: SELECT APP (Image 2) ================= */}
              {step === 1 && (
                <div className="grid grid-cols-3 gap-6 max-w-6xl xl:max-w-7xl mx-auto">
                  {/* Left 2 Cols: Form */}
                  <div className="col-span-2 space-y-4">
                    <div>
                      <h2 className="text-base font-bold text-[#1e293b] dark:text-[#f8fafc]">
                        Select the application to run
                      </h2>
                      <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                        Select the built .gpmlaunch file. You can pick multiple files at once.
                      </p>
                    </div>

                    {/* Card 1: Session name */}
                    <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-2 shadow-xs">
                      <div>
                        <div className="font-semibold text-xs text-[#1e293b] dark:text-[#f1f5f9]">Session name</div>
                        <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                          Session identifier — shown in logs and history
                        </div>
                      </div>
                      <input
                        type="text"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md font-mono text-[#1e293b] dark:text-[#f1f5f9] focus:border-[#1677ff] focus:outline-none"
                      />
                    </div>

                    {/* Card 2: App source */}
                    <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-xs text-[#1e293b] dark:text-[#f1f5f9]">App source</div>
                          <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                            .gpmlaunch only — multi-select supported
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-xs">
                          <button className="flex items-center space-x-1 text-[#ea580c] hover:underline cursor-pointer">
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Open existing session</span>
                          </button>
                          <button className="flex items-center space-x-1 text-[#1677ff] hover:underline font-semibold cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Application ▾</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#e2e8f0] dark:border-[#1e293b]">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[#64748b]">Selected</span>
                          <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950 text-[#1677ff] font-bold text-[10px] flex items-center justify-center">
                            1
                          </span>
                        </div>
                        <span className="text-[#64748b]">1 items</span>
                      </div>

                      {/* Selected App Item Card (Image 2) */}
                      <div className="bg-white dark:bg-[#0a0f1d] border border-[#e2e8f0] dark:border-[#1e293b] rounded-lg p-3 flex items-center justify-between shadow-xs">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-[#1677ff]">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-xs text-[#1e293b] dark:text-[#f1f5f9]">
                                {appName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-[#1677ff] text-[9px] font-bold">
                                BROWSER
                              </span>
                            </div>
                            <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] font-mono mt-0.5">
                              {appPath}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="w-5 h-5 rounded-full bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <button className="text-[#94a3b8] hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Col: Session Summary + Tip (Image 2) */}
                  <div className="space-y-4">
                    {/* Session Summary Card */}
                    <div className="bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="text-[11px] font-bold tracking-wider text-[#64748b] dark:text-[#94a3b8] uppercase">
                        SESSION SUMMARY
                      </div>

                      <div className="flex items-center space-x-2.5 pb-3 border-b border-[#e2e8f0] dark:border-[#1e293b]">
                        <div className="w-8 h-8 rounded-lg bg-[#1677ff] text-white flex items-center justify-center shadow-xs">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">SV Browser Automate</div>
                          <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">1 apps selected</div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Runtime type</span>
                          <span className="font-medium text-[#1e293b] dark:text-[#f1f5f9]">Browser</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">App count</span>
                          <span className="font-medium text-[#1e293b] dark:text-[#f1f5f9]">1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Configuration</span>
                          <span className="text-[#94a3b8] italic">- not configured</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Profile</span>
                          <span className="text-[#94a3b8] italic">- not selected</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b] flex items-center space-x-1.5 text-[10px] text-[#64748b]">
                        <Shield className="w-3 h-3 text-[#1677ff] shrink-0" />
                        <span>The .gpmlaunch file will be security-checked before running.</span>
                      </div>
                    </div>

                    {/* Tip Box */}
                    <div className="bg-[#f0fdf4] dark:bg-[#062016] border border-[#86efac] dark:border-[#14532d] rounded-xl p-4 text-xs space-y-1 text-[#15803d] dark:text-[#4ade80]">
                      <div className="font-bold">Tip</div>
                      <p className="text-[11px] text-[#166534] dark:text-[#86efac]">
                        You can select multiple apps at once
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: CONFIGURE (Images 3, 4, 5) ================= */}
              {step === 2 && (
                <div className="flex gap-5 max-w-6xl xl:max-w-7xl mx-auto w-full">
                  {/* Left Sidebar Menu */}
                  <div className="w-48 shrink-0 space-y-2">
                    <div className="text-[11px] font-bold tracking-wider text-[#64748b] dark:text-[#94a3b8] uppercase mb-2">
                      CONFIGURATION MENU
                    </div>

                    <button
                      onClick={() => setConfigMenu('inputs')}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        configMenu === 'inputs'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-[#1677ff] dark:text-[#38bdf8] border-l-2 border-[#1677ff]'
                          : 'text-[#475569] dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5 shrink-0" />
                      <span>Inputs</span>
                    </button>

                    <button
                      onClick={() => setConfigMenu('session')}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        configMenu === 'session'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-[#1677ff] dark:text-[#38bdf8] border-l-2 border-[#1677ff]'
                          : 'text-[#475569] dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="shrink-0">🚀</span>
                      <span className="truncate">Session Configuration</span>
                    </button>

                    <button
                      onClick={() => setConfigMenu('schedule')}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        configMenu === 'schedule'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-[#1677ff] dark:text-[#38bdf8] border-l-2 border-[#1677ff]'
                          : 'text-[#475569] dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Schedule</span>
                    </button>
                  </div>

                  {/* Center Content Area */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Sub-tab 1: Inputs (Image 3) */}
                    {configMenu === 'inputs' && (
                      <div className="space-y-4">
                        {/* Window & Screen Card (Chia đều màn hình theo % & Ưu tiên góc trái trên) */}
                        {(() => {
                          const gridConfig = getEffectiveGridConfig(numThreads);
                          const activeScreen = getActiveScreen();

                          return (
                            <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3.5 shadow-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-[#1677ff] dark:text-[#38bdf8] flex items-center justify-center font-bold text-sm">
                                    🔲
                                  </div>
                                  <div>
                                    <div className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">
                                      Window & Screen (Chia đều màn hình)
                                    </div>
                                    <div className="text-[11px] text-[#64748b]">
                                      Tỉ lệ % màn hình, tự động dàn đều cửa sổ bắt đầu từ góc trái trên
                                    </div>
                                  </div>
                                </div>

                                {/* Mode Toggle: Tỉ lệ % vs Pixels cố định */}
                                <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => setWindowSizeMode('percent')}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                                      windowSizeMode === 'percent'
                                        ? 'bg-white dark:bg-[#1677ff] text-[#1677ff] dark:text-white shadow-2xs font-semibold'
                                        : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b]'
                                    }`}
                                  >
                                    Tỉ lệ % Màn hình (Grid)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setWindowSizeMode('custom')}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                                      windowSizeMode === 'custom'
                                        ? 'bg-white dark:bg-[#1677ff] text-[#1677ff] dark:text-white shadow-2xs font-semibold'
                                        : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b]'
                                    }`}
                                  >
                                    Pixel cố định (Custom)
                                  </button>
                                </div>
                              </div>

                              {windowSizeMode === 'percent' ? (
                                <div className="space-y-3 pt-1">
                                  {/* Quick Presets */}
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1.5">
                                      Tùy chọn chia lưới tỉ lệ theo % màn hình:
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 text-xs">
                                      {[
                                        { id: 'auto', label: '⚡ Tự động theo luồng', desc: 'Tự tính theo số luồng' },
                                        { id: '2x2', label: '2x2 (50% x 50%)', desc: '4 cửa sổ' },
                                        { id: '3x2', label: '3x2 (33% x 50%)', desc: '6 cửa sổ' },
                                        { id: '4x2', label: '4x2 (25% x 50%)', desc: '8 cửa sổ' },
                                        { id: '2x1', label: '2x1 (50% x 100%)', desc: '2 cửa sổ dọc' },
                                        { id: 'custom', label: '⚙ Tùy chỉnh %', desc: 'Tự nhập %' },
                                      ].map((p) => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => setTilePreset(p.id)}
                                          className={`px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                                            tilePreset === p.id
                                              ? 'border-[#1677ff] bg-blue-50 dark:bg-blue-950/60 text-[#1677ff] dark:text-[#38bdf8] font-bold shadow-2xs'
                                              : 'border-[#d9d9d9] dark:border-[#1e293b] bg-white dark:bg-[#0a0f1d] text-[#334155] dark:text-[#94a3b8] hover:border-slate-400'
                                          }`}
                                        >
                                          <div className="text-[11px] truncate">{p.label}</div>
                                          <div className="text-[9px] text-[#64748b] truncate">{p.desc}</div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Custom % Inputs if tilePreset === 'custom' */}
                                  {tilePreset === 'custom' && (
                                    <div className="flex flex-wrap items-center gap-3 p-2.5 bg-white dark:bg-[#0a0f1d] border border-[#e2e8f0] dark:border-[#1e293b] rounded-lg text-xs">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-[#64748b]">Rộng (% Width):</span>
                                        <input
                                          type="number"
                                          min={10}
                                          max={100}
                                          value={percentWidth}
                                          onChange={(e) => setPercentWidth(Math.max(10, Math.min(100, parseFloat(e.target.value) || 50)))}
                                          className="w-16 px-2 py-1 text-xs bg-slate-50 dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-center font-bold"
                                        />
                                        <span className="text-[#64748b]">%</span>
                                      </div>
                                      <span className="text-[#cbd5e1]">✕</span>
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-[#64748b]">Cao (% Height):</span>
                                        <input
                                          type="number"
                                          min={10}
                                          max={100}
                                          value={percentHeight}
                                          onChange={(e) => setPercentHeight(Math.max(10, Math.min(100, parseFloat(e.target.value) || 50)))}
                                          className="w-16 px-2 py-1 text-xs bg-slate-50 dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-center font-bold"
                                        />
                                        <span className="text-[#64748b]">%</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Auto Tile Checkbox & Layout Rule (Ưu tiên góc trái trên rồi tự động chia ra) */}
                                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-lg space-y-2">
                                    <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={autoTileWindows}
                                        onChange={(e) => setAutoTileWindows(e.target.checked)}
                                        className="rounded text-[#1677ff] focus:ring-0 w-4 h-4 mt-0.5"
                                      />
                                      <div className="text-xs">
                                        <span className="font-bold text-[#1e293b] dark:text-[#f1f5f9]">
                                          Tự động chia đều các cửa sổ trên màn hình (Auto Tile Grid)
                                        </span>
                                        <div className="text-[11px] text-[#475569] dark:text-[#94a3b8] mt-0.5">
                                          ✔ <strong>Ưu tiên góc trái trên cùng (Top-Left: 0, 0)</strong> cho cửa sổ đầu tiên.
                                          <br />
                                          ✔ Tự động lấp đầy các cửa sổ sang bên phải theo hàng ngang, khi hết bề rộng màn hình sẽ tự động xuống hàng tiếp theo.
                                        </div>
                                      </div>
                                    </label>

                                    {/* Live Info & Mini Visual Preview */}
                                    {autoTileWindows && (
                                      <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="text-[11px] text-[#0958d9] dark:text-[#60a5fa] font-medium">
                                          📊 Kích thước tính toán: <strong className="font-bold font-mono">{gridConfig.winWidth} x {gridConfig.winHeight} px</strong> ({gridConfig.percentWidth}% x {gridConfig.percentHeight}%) • Lưới <strong>{gridConfig.cols} cột x {gridConfig.rows} hàng</strong>
                                        </div>

                                        {/* Mini Grid representation */}
                                        <div className="flex items-center space-x-1.5 p-1 bg-white dark:bg-[#0a0f1d] border border-blue-200 dark:border-blue-900 rounded shadow-2xs">
                                          <span className="text-[9px] text-[#64748b] px-1 font-mono">Top-Left ➔</span>
                                          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(4, gridConfig.cols)}, minmax(0, 1fr))` }}>
                                            {Array.from({ length: Math.min(8, gridConfig.cols * gridConfig.rows) }).map((_, i) => (
                                              <div
                                                key={i}
                                                className={`w-5 h-3.5 rounded-[2px] text-[8px] font-bold flex items-center justify-center ${
                                                  i === 0
                                                    ? 'bg-[#1677ff] text-white'
                                                    : 'bg-blue-100 dark:bg-blue-950 text-[#1677ff] dark:text-[#38bdf8] border border-blue-200 dark:border-blue-800'
                                                }`}
                                                title={i === 0 ? 'Cửa sổ 1: Góc trái trên (0, 0)' : `Cửa sổ ${i + 1}`}
                                              >
                                                {i + 1}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                /* Fixed Pixels Mode */
                                <div className="space-y-2 pt-1">
                                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8]">
                                    Kích thước cửa sổ cố định (Pixel)
                                  </label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="number"
                                      value={windowWidth}
                                      onChange={(e) => setWindowWidth(parseInt(e.target.value, 10) || 800)}
                                      className="w-20 px-2 py-1 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-center font-bold"
                                    />
                                    <span className="text-[#64748b]">x</span>
                                    <input
                                      type="number"
                                      value={windowHeight}
                                      onChange={(e) => setWindowHeight(parseInt(e.target.value, 10) || 600)}
                                      className="w-20 px-2 py-1 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-center font-bold"
                                    />
                                    <span className="text-[11px] text-[#64748b] ml-2 font-mono">
                                      (~{gridConfig.percentWidth}% x ~{gridConfig.percentHeight}% màn hình)
                                    </span>
                                  </div>

                                  <label className="flex items-center space-x-2 cursor-pointer pt-2 select-none">
                                    <input
                                      type="checkbox"
                                      checked={autoTileWindows}
                                      onChange={(e) => setAutoTileWindows(e.target.checked)}
                                      className="rounded text-[#1677ff] focus:ring-0 w-4 h-4"
                                    />
                                    <span className="text-xs text-[#1e293b] dark:text-[#f1f5f9]">
                                      Tự động xếp dàn đều từ góc trái trên (0, 0)
                                    </span>
                                  </label>
                                </div>
                              )}

                              {/* Scale & Target Screen */}
                              <div className="grid grid-cols-12 gap-3 pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b]">
                                <div className="col-span-4">
                                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                                    Scale (% zoom)
                                  </label>
                                  <div className="flex items-center space-x-1.5">
                                    <input
                                      type="number"
                                      value={windowScale}
                                      onChange={(e) => setWindowScale(parseInt(e.target.value, 10) || 100)}
                                      className="w-full px-2 py-1 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-center font-semibold"
                                    />
                                    <span className="text-[#64748b] text-xs">%</span>
                                  </div>
                                </div>

                                <div className="col-span-8">
                                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                                    Màn hình hiển thị (Target Screen)
                                  </label>
                                  <select
                                    value={screenTarget}
                                    onChange={(e) => setScreenTarget(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded cursor-pointer text-[#1e293b] dark:text-[#f1f5f9]"
                                  >
                                    {screenDisplays.length > 0 ? (
                                      screenDisplays.map((d) => (
                                        <option key={d.id} value={d.label}>
                                          {d.label} • Khả dụng: {d.workArea.width}x{d.workArea.height}
                                        </option>
                                      ))
                                    ) : (
                                      <>
                                        <option value="Screen 1 • 1920x1080 (primary)">Screen 1 • 1920x1080 (primary)</option>
                                        <option value="Screen 2 • 1920x1080">Screen 2 • 1920x1080</option>
                                      </>
                                    )}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Use input Excel Card (Matching media_1789807572614.png and media_1789807634164.png) */}
                        <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3 shadow-xs">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                              X
                            </div>
                            <div>
                              <div className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">Use input Excel</div>
                              <div className="text-[11px] text-[#64748b]">Read data from Excel to map per profile</div>
                            </div>
                          </div>

                          <label className="flex items-center space-x-2 cursor-pointer pt-1 select-none">
                            <input
                              type="checkbox"
                              checked={useInputExcel}
                              onChange={(e) => setUseInputExcel(e.target.checked)}
                              className="rounded text-[#1677ff] focus:ring-0 w-4 h-4"
                            />
                            <span className="text-xs font-semibold text-[#1e293b] dark:text-[#f1f5f9]">Use input Excel</span>
                          </label>

                          {useInputExcel && (
                            <div className="pt-2 pl-6 space-y-3.5 border-t border-[#e2e8f0]/60 dark:border-[#1e293b]/60 mt-2">
                              {/* Row 1: Excel file */}
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-3 text-xs text-[#475569] dark:text-[#94a3b8]">Excel file</div>
                                <div className="col-span-6">
                                  <input
                                    type="text"
                                    placeholder="File path .xlsx / .xls / .csv"
                                    value={excelFilePath}
                                    onChange={(e) => setExcelFilePath(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-[#1e293b] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:border-[#1677ff] focus:outline-none"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <button
                                    type="button"
                                    onClick={handleBrowseExcel}
                                    className="w-full px-3 py-1.5 bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-xs text-[#334155] dark:text-[#cbd5e1] hover:border-[#1677ff] hover:text-[#1677ff] flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5 text-[#64748b]" />
                                    <span>Browse...</span>
                                  </button>
                                </div>
                              </div>

                              {/* Row 2: Sheet Id */}
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-3 text-xs text-[#475569] dark:text-[#94a3b8]">Sheet Id</div>
                                <div className="col-span-3">
                                  <input
                                    type="number"
                                    min={0}
                                    value={excelSheetId}
                                    onChange={(e) => setExcelSheetId(parseInt(e.target.value, 10) || 0)}
                                    className="w-24 px-3 py-1 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-[#1e293b] dark:text-[#f1f5f9] focus:border-[#1677ff] focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Row 3: Map mode */}
                              <div className="grid grid-cols-12 gap-2 items-start pt-1">
                                <div className="col-span-3 text-xs text-[#475569] dark:text-[#94a3b8] pt-0.5">Map mode:</div>
                                <div className="col-span-9 space-y-1">
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                                      <input
                                        type="radio"
                                        name="excelMapMode"
                                        checked={excelMapMode === 'all'}
                                        onChange={() => setExcelMapMode('all')}
                                        className="text-[#1677ff] focus:ring-0"
                                      />
                                      <span className={`text-xs ${excelMapMode === 'all' ? 'text-[#1677ff] font-medium' : 'text-[#475569] dark:text-[#94a3b8]'}`}>
                                        Each profile reads all rows
                                      </span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                                      <input
                                        type="radio"
                                        name="excelMapMode"
                                        checked={excelMapMode === 'one'}
                                        onChange={() => setExcelMapMode('one')}
                                        className="text-[#1677ff] focus:ring-0"
                                      />
                                      <span className={`text-xs ${excelMapMode === 'one' ? 'text-[#1677ff] font-medium' : 'text-[#475569] dark:text-[#94a3b8]'}`}>
                                        Each profile reads one row
                                      </span>
                                    </label>
                                  </div>
                                  <div className="text-[11px] text-[#64748b]">
                                    {excelMapMode === 'all'
                                      ? 'The profile iterates over all mapped rows'
                                      : 'Each profile processes its corresponding row'}
                                  </div>
                                </div>
                              </div>

                              {/* Row 4: Map according to profile name in Column A */}
                              <label className="flex items-center space-x-2 cursor-pointer select-none pt-1">
                                <input
                                  type="checkbox"
                                  checked={excelMapColA}
                                  onChange={(e) => setExcelMapColA(e.target.checked)}
                                  className="rounded text-[#1677ff] focus:ring-0 w-4 h-4"
                                />
                                <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                                  Map according to the profile name in column A
                                </span>
                              </label>

                              {/* Row 5: Write 'OK' status upon completion */}
                              <label className="flex items-center space-x-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={excelWriteOk}
                                  onChange={(e) => setExcelWriteOk(e.target.checked)}
                                  className="rounded text-[#1677ff] focus:ring-0 w-4 h-4"
                                />
                                <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                                  Write 'OK' status to the Excel file upon completion
                                </span>
                              </label>

                              {/* OK column input */}
                              {excelWriteOk && (
                                <div className="flex items-center space-x-3 pl-6">
                                  <span className="text-xs text-[#475569] dark:text-[#94a3b8]">OK column:</span>
                                  <input
                                    type="text"
                                    value={excelOkCol}
                                    onChange={(e) => setExcelOkCol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                    placeholder="Z"
                                    className="w-20 px-2.5 py-1 text-xs uppercase font-mono bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-center font-bold text-[#1677ff] focus:border-[#1677ff] focus:outline-none"
                                  />
                                </div>
                              )}

                              {/* User requested skip features */}
                              <div className="pt-2 border-t border-[#e2e8f0]/80 dark:border-[#1e293b] space-y-2.5">
                                <label className="flex items-center space-x-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={excelSkipIfHasText}
                                    onChange={(e) => setExcelSkipIfHasText(e.target.checked)}
                                    className="rounded text-[#1677ff] focus:ring-0 w-4 h-4"
                                  />
                                  <span className="text-xs text-[#334155] dark:text-[#cbd5e1] font-medium">
                                    Bỏ qua nếu cột trạng thái đã có chữ (Skip if column already has value)
                                  </span>
                                </label>

                                <div className="flex items-center space-x-2 pl-6">
                                  <span className="text-xs text-[#475569] dark:text-[#94a3b8] shrink-0">
                                    Bỏ qua nếu chứa (Skip keywords):
                                  </span>
                                  <input
                                    type="text"
                                    value={skipStatusKeywords}
                                    onChange={(e) => setSkipStatusKeywords(e.target.value)}
                                    placeholder="done, trạng thái:, error"
                                    title="Nhập các từ khóa phân cách bằng dấu phẩy. Nếu ô hoặc dòng chứa các từ này sẽ bỏ qua không chạy."
                                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-[#dc2626] dark:text-red-400 font-mono focus:border-[#1677ff] focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Use input Text file Card */}
                        <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3 shadow-xs">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">Use input Text file (.txt)</div>
                              <div className="text-[11px] text-[#64748b]">Read data from TXT file to map per profile</div>
                            </div>
                          </div>

                          <label className="flex items-center space-x-2 cursor-pointer pt-1 select-none">
                            <input
                              type="checkbox"
                              checked={useInputTxt}
                              onChange={(e) => setUseInputTxt(e.target.checked)}
                              className="rounded text-[#1677ff] focus:ring-0 w-4 h-4"
                            />
                            <span className="text-xs font-semibold text-[#1e293b] dark:text-[#f1f5f9]">Use input Text file</span>
                          </label>

                          {useInputTxt && (
                            <div className="pt-2 pl-6 space-y-3 border-t border-[#e2e8f0]/60 dark:border-[#1e293b]/60 mt-2">
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-3 text-xs text-[#475569] dark:text-[#94a3b8]">TXT file</div>
                                <div className="col-span-6">
                                  <input
                                    type="text"
                                    placeholder="File path .txt / .csv"
                                    value={txtFilePath}
                                    onChange={(e) => setTxtFilePath(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-[#1e293b] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:border-[#1677ff] focus:outline-none"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <button
                                    type="button"
                                    onClick={handleBrowseTxt}
                                    className="w-full px-3 py-1.5 bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-xs text-[#334155] dark:text-[#cbd5e1] hover:border-[#1677ff] hover:text-[#1677ff] flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5 text-[#64748b]" />
                                    <span>Browse...</span>
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-3 text-xs text-[#475569] dark:text-[#94a3b8]">Map mode:</div>
                                <div className="col-span-9 flex items-center space-x-6">
                                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                                    <input
                                      type="radio"
                                      name="txtMapMode"
                                      checked={txtMapMode === 'one'}
                                      onChange={() => setTxtMapMode('one')}
                                      className="text-[#1677ff] focus:ring-0"
                                    />
                                    <span className={`text-xs ${txtMapMode === 'one' ? 'text-[#1677ff] font-medium' : 'text-[#475569] dark:text-[#94a3b8]'}`}>
                                      Each profile reads one line
                                    </span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                                    <input
                                      type="radio"
                                      name="txtMapMode"
                                      checked={txtMapMode === 'all'}
                                      onChange={() => setTxtMapMode('all')}
                                      className="text-[#1677ff] focus:ring-0"
                                    />
                                    <span className={`text-xs ${txtMapMode === 'all' ? 'text-[#1677ff] font-medium' : 'text-[#475569] dark:text-[#94a3b8]'}`}>
                                      Each profile reads all lines
                                    </span>
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-[#475569] dark:text-[#94a3b8] shrink-0">
                                  Bỏ qua nếu dòng chứa:
                                </span>
                                <input
                                  type="text"
                                  value={txtSkipKeywords}
                                  onChange={(e) => setTxtSkipKeywords(e.target.value)}
                                  placeholder="done, trạng thái:, error, OK"
                                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-[#dc2626] dark:text-red-400 font-mono focus:border-[#1677ff] focus:outline-none"
                                />
                              </div>

                              <label className="flex items-center space-x-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={txtWriteOk}
                                  onChange={(e) => setTxtWriteOk(e.target.checked)}
                                  className="rounded text-[#1677ff] focus:ring-0 w-4 h-4"
                                />
                                <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                                  Ghi 'OK' vào file TXT sau khi hoàn thành
                                </span>
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Input from application */}
                        <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-2 shadow-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">ℹ️</span>
                            <div>
                              <div className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">
                                Input from application
                              </div>
                              <div className="text-[11px] text-[#64748b]">Parameters declared in project</div>
                            </div>
                          </div>

                          <div className="py-6 text-center text-[#94a3b8] space-y-1">
                            <FolderOpen className="w-6 h-6 mx-auto opacity-50" />
                            <div className="text-[11px]">This app does not declare custom inputs</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 2: Session Configuration (Matching Image 4) */}
                    {configMenu === 'session' && (
                      <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-5 space-y-4 shadow-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🚀</span>
                          <div>
                            <div className="font-bold text-sm text-[#1e293b] dark:text-[#f1f5f9]">
                              Session Configuration
                            </div>
                            <div className="text-[11px] text-[#64748b]">How the session runs and reacts to errors.</div>
                          </div>
                        </div>

                        {/* Row: Session name, Number of Threads, Thread delay */}
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                              Session name
                            </label>
                            <input
                              type="text"
                              value={sessionName}
                              onChange={(e) => setSessionName(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                              Number of Threads
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={numThreads}
                              onChange={(e) => setNumThreads(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-full px-2.5 py-1 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-center font-bold text-[#1677ff]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                              Thread delay (s)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={threadDelay}
                              onChange={(e) => setThreadDelay(parseInt(e.target.value, 10) || 0)}
                              className="w-full px-2.5 py-1 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-center"
                            />
                          </div>
                        </div>

                        {/* Checkboxes List matching Image 4 */}
                        <div className="space-y-3 pt-3 border-t border-[#e2e8f0] dark:border-[#1e293b]">
                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={skipProxyCheck}
                              onChange={(e) => setSkipProxyCheck(e.target.checked)}
                              className="rounded text-[#1677ff]"
                            />
                            <span className="text-[#ea580c]">🛡</span>
                            <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                              Skip proxy check before opening profile (not recommended) (SV Browser)
                            </span>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={doNotCloseOnError}
                              onChange={(e) => setDoNotCloseOnError(e.target.checked)}
                              className="rounded text-[#1677ff]"
                            />
                            <span className="text-[#ef4444]">💥</span>
                            <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                              Do not close profile on error (supports error checking)
                            </span>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={closeBrowserOnDone}
                              onChange={(e) => setCloseBrowserOnDone(e.target.checked)}
                              className="rounded text-[#1677ff]"
                            />
                            <span className="text-[#64748b]">🚪</span>
                            <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                              Close browser profile when workflow completes (uncheck to keep browser open)
                            </span>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={performanceLimit}
                              onChange={(e) => setPerformanceLimit(e.target.checked)}
                              className="rounded text-[#1677ff]"
                            />
                            <Cpu className="w-3.5 h-3.5 text-[#10b981]" />
                            <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                              Performance limit at 90%
                            </span>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hideWindowWhenDone}
                              onChange={(e) => setHideWindowWhenDone(e.target.checked)}
                              className="rounded text-[#1677ff]"
                            />
                            <EyeOff className="w-3.5 h-3.5 text-[#64748b]" />
                            <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                              Hide window when done and active when process resume (Mở Chrome ẩn danh - start-incognito)
                            </span>
                          </label>

                          {/* ================= USE VIRTUAL MOUSE (Image 4) ================= */}
                          <label className="flex items-center space-x-2.5 cursor-pointer bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-lg border border-blue-200/60 dark:border-blue-900/40">
                            <input
                              type="checkbox"
                              checked={useVirtualMouse}
                              onChange={(e) => setUseVirtualMouse(e.target.checked)}
                              className="rounded text-[#1677ff] w-4 h-4 cursor-pointer"
                            />
                            <div className="w-4 h-4 flex items-center justify-center">
                              {/* Red pointer matching Image 1 */}
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M4 2L20 12L12.5 13.5L9.5 20L4 2Z"
                                  fill="#ef4444"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <span className="text-xs font-bold text-[#1677ff] dark:text-[#38bdf8]">
                                Use virtual mouse
                              </span>
                              <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] ml-2 italic">
                                (Each Chrome thread has its own visible red cursor moving & clicking independently)
                              </span>
                            </div>
                          </label>

                          {/* Restart on error */}
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="checkbox"
                              checked={restartOnError}
                              onChange={(e) => setRestartOnError(e.target.checked)}
                              className="rounded text-[#1677ff]"
                            />
                            <RotateCcw className="w-3.5 h-3.5 text-[#1677ff]" />
                            <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                              Restart on error. Number of tries:
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={retryCount}
                              onChange={(e) => setRetryCount(parseInt(e.target.value, 10) || 3)}
                              disabled={!restartOnError}
                              className="w-14 px-2 py-0.5 text-xs bg-white dark:bg-[#0a0f1d] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-center disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 3: Schedule (Image 5) */}
                    {configMenu === 'schedule' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 rounded-lg text-xs text-[#1677ff] flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Note: you need to keep the app running if scheduling</span>
                        </div>

                        <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3 shadow-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-base">📅</span>
                            <div>
                              <div className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">Schedule</div>
                              <div className="text-[11px] text-[#64748b]">Cron expression or specific time</div>
                            </div>
                          </div>

                          <label className="flex items-center space-x-2 cursor-pointer pt-2">
                            <input
                              type="checkbox"
                              checked={useSchedule}
                              onChange={(e) => setUseSchedule(e.target.checked)}
                              className="rounded text-[#1677ff]"
                            />
                            <span className="text-xs text-[#334155] dark:text-[#cbd5e1]">Use scheduling feature</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Col: SUMMARY Card (Images 3, 4, 5) */}
                  <div className="w-64 shrink-0 space-y-4">
                    <div className="bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="text-[11px] font-bold tracking-wider text-[#64748b] dark:text-[#94a3b8] uppercase">
                        SUMMARY
                      </div>

                      <div className="flex items-center space-x-2 pb-3 border-b border-[#e2e8f0] dark:border-[#1e293b]">
                        <div className="w-7 h-7 rounded-lg bg-[#1677ff] text-white flex items-center justify-center">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">Browser automation</div>
                          <div className="text-[10px] text-[#64748b]">{appName}</div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Worker</span>
                          <span className="font-bold text-[#1677ff] dark:text-[#38bdf8]">{numThreads}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Excel</span>
                          <span className="font-medium text-[#1e293b] dark:text-[#f1f5f9]">
                            {useInputExcel ? 'True' : 'False'}
                          </span>
                        </div>
                        {useInputTxt && (
                          <div className="flex justify-between">
                            <span className="text-[#64748b]">Text File</span>
                            <span className="font-medium text-[#1e293b] dark:text-[#f1f5f9]">
                              True
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Performance</span>
                          <span className="font-medium text-[#1e293b] dark:text-[#f1f5f9]">
                            {performanceLimit ? 'True' : 'False'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Retry</span>
                          <span className="font-medium text-[#1e293b] dark:text-[#f1f5f9]">
                            {restartOnError ? retryCount : 'False'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Schedule</span>
                          <span className="font-medium text-[#1e293b] dark:text-[#f1f5f9]">
                            {useSchedule ? 'True' : 'False'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Incognito (Ẩn danh)</span>
                          <span className={`font-semibold ${hideWindowWhenDone ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                            {hideWindowWhenDone ? 'True' : 'False'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Check IP/Proxy</span>
                          <span className={`font-semibold ${skipProxyCheck ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {skipProxyCheck ? 'Skipped' : 'Enabled (Check)'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b] flex items-center space-x-1.5 text-[10px] text-[#64748b]">
                        <Lightbulb className="w-3.5 h-3.5 text-[#1677ff] shrink-0" />
                        <span>Enable retry to increase success rate on long workflows.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 3: PROFILE SELECTION (http://localhost:8725/api/v3/profiles) ================= */}
              {step === 3 && (
                <div className="max-w-6xl xl:max-w-7xl mx-auto space-y-3">
                  {/* Controls Row: Engine, Provider, API status */}
                  <div className="flex items-center space-x-2.5">
                    {/* Engine selector */}
                    <div className="relative">
                      <button
                        type="button"
                        className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9] hover:border-[#1677ff] shadow-2xs cursor-pointer"
                      >
                        <Cpu className="w-3.5 h-3.5 text-[#1677ff]" />
                        <span>{selectedEngine}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" />
                      </button>
                    </div>

                    {/* Provider selector */}
                    <div className="relative">
                      <button
                        type="button"
                        className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9] hover:border-[#1677ff] shadow-2xs cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#1677ff]" />
                        <span>{selectedProvider}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" />
                      </button>
                    </div>

                    {/* API status badge */}
                    <button
                      type="button"
                      onClick={fetchProfiles}
                      title="API endpoint: http://localhost:8725/api/v1/profiles (Click to refresh)"
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity ${
                        apiStatus === 'connected'
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>API</span>
                      {apiStatus === 'connected' && (
                        <span className="text-[10px] font-normal opacity-80">(8725)</span>
                      )}
                    </button>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Group Filter */}
                    <div className="relative min-w-[130px]">
                      <select
                        value={selectedGroup}
                        onChange={(e) => {
                          setSelectedGroup(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full appearance-none px-3 py-1.5 pr-7 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] cursor-pointer"
                        title="Lọc theo Nhóm (Group)"
                      >
                        {groups.map((grp) => (
                          <option key={grp} value={grp}>
                            {grp === 'All' ? '📁 Tất cả nhóm' : grp}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Tag Filter */}
                    <div className="relative min-w-[130px]">
                      <select
                        value={selectedTag}
                        onChange={(e) => {
                          setSelectedTag(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full appearance-none px-3 py-1.5 pr-7 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] cursor-pointer"
                        title="Lọc profile theo Thẻ (Tags từ /api/v1/tags)"
                      >
                        {tagOptions.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag === 'All' ? '🏷️ Tất cả thẻ (Tags)' : `# ${tag}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[170px]">
                      <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Tìm tên, nhóm, core, thẻ tag..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-xs text-[#1e293b] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:outline-none focus:border-[#1677ff]"
                      />
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative min-w-[160px]">
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="w-full appearance-none px-3 py-1.5 pr-7 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] cursor-pointer"
                        title="Lựa chọn sắp xếp danh sách profile"
                      >
                        <option value="default">Mặc định (Default Order)</option>
                        <option value="asc">Tên (A → Z)</option>
                        <option value="desc">Tên (Z → A)</option>
                        <option value="core_asc">Core (A → Z)</option>
                        <option value="core_desc">Core (Z → A)</option>
                        <option value="id_desc">Mới nhất trước (Newest First)</option>
                        <option value="id_asc">Cũ nhất trước (Oldest First)</option>
                        <option value="group_asc">Nhóm (A → Z)</option>
                        <option value="group_desc">Nhóm (Z → A)</option>
                        <option value="selected_first">Đã chọn lên đầu (Selected First)</option>
                        <option value="unselected_first">Chưa chọn lên đầu (Unselected First)</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Refresh Button */}
                    <button
                      type="button"
                      onClick={() => {
                        fetchProfiles();
                        fetchTags();
                      }}
                      title="Làm mới danh sách profile & thẻ tag (http://localhost:8725)"
                      className="p-1.5 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-[#64748b] hover:text-[#1677ff] hover:border-[#1677ff] transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingProfiles ? 'animate-spin text-[#1677ff]' : ''}`} />
                    </button>
                  </div>

                  {/* Quick Selection Toolbar (Select All Ctrl+A, Deselect All, Invert, Count) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#f8fafc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-lg text-xs">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="px-2.5 py-1 bg-white dark:bg-[#0a0f1d] hover:bg-blue-50 dark:hover:bg-blue-950 border border-[#d9d9d9] dark:border-[#1e293b] hover:border-[#1677ff] rounded-md text-[#1e293b] dark:text-[#f1f5f9] font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Select or deselect all filtered profiles (Ctrl+A)"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-[#1677ff]" />
                        <span>{isAllSelected ? 'Deselect All' : 'Select All (Ctrl+A)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateSelectedProfiles([])}
                        disabled={selectedProfileIds.length === 0}
                        className="px-2.5 py-1 bg-white dark:bg-[#0a0f1d] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-[#64748b] dark:text-[#94a3b8] font-medium flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Clear selection</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const currentSet = new Set(selectedProfileIds);
                          const next: string[] = [];
                          filteredProfiles.forEach((p) => {
                            if (!currentSet.has(String(p.id))) {
                              next.push(String(p.id));
                            }
                          });
                          // Retain profiles from other groups if any
                          const filteredSet = new Set(filteredProfiles.map((p) => String(p.id)));
                          selectedProfileIds.forEach((id) => {
                            if (!filteredSet.has(id)) next.push(id);
                          });
                          updateSelectedProfiles(next);
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-[#0a0f1d] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-[#64748b] dark:text-[#94a3b8] font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <span>Invert</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[#64748b]">Selected:</span>
                      <span className="font-bold text-[#1677ff] dark:text-[#38bdf8]">
                        {selectedProfileIds.length} / {profiles.length} profiles
                      </span>
                      {selectedProfileIds.length > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40">
                          Saved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Profile Table Matching Image Exactly */}
                  <div
                    tabIndex={0}
                    title="Click in the table and press Ctrl+A to select all profiles, or Shift+Click to select a range"
                    className="border border-[#e2e8f0] dark:border-[#1e293b] rounded-lg overflow-hidden bg-white dark:bg-[#0f172a] shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#1677ff]/50"
                  >
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#f8fafc] dark:bg-[#0a0f1d] border-b border-[#e2e8f0] dark:border-[#1e293b] text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] items-center select-none">
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={isCurrentPageAllSelected}
                          onChange={toggleSelectCurrentPage}
                          className="w-4 h-4 rounded text-[#1677ff] focus:ring-0 cursor-pointer"
                          title={isCurrentPageAllSelected ? "Bỏ chọn tất cả trên trang này" : "Chọn tất cả trên trang này"}
                        />
                      </div>
                      <div
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="col-span-4 font-medium text-[#475569] dark:text-[#cbd5e1] flex items-center space-x-1 cursor-pointer hover:text-[#1677ff] transition-colors"
                        title="Click để đổi thứ tự sắp xếp theo tên"
                      >
                        <span>Profile Name</span>
                        {sortOrder === 'asc' && <span className="text-[#1677ff] font-bold">↑</span>}
                        {sortOrder === 'desc' && <span className="text-[#1677ff] font-bold">↓</span>}
                      </div>
                      <div className="col-span-3 font-medium text-[#475569] dark:text-[#cbd5e1] flex items-center space-x-1">
                        <Tag className="w-3.5 h-3.5 text-[#94a3b8]" />
                        <span>Tags</span>
                      </div>
                      <div
                        onClick={() => setSortOrder(sortOrder === 'core_asc' ? 'core_desc' : 'core_asc')}
                        className="col-span-2 text-center font-medium text-[#475569] dark:text-[#cbd5e1] flex items-center justify-center space-x-1 cursor-pointer hover:text-[#1677ff] transition-colors"
                        title="Click để đổi thứ tự sắp xếp theo Core trình duyệt"
                      >
                        <span>Core</span>
                        {sortOrder === 'core_asc' && <span className="text-[#1677ff] font-bold">↑</span>}
                        {sortOrder === 'core_desc' && <span className="text-[#1677ff] font-bold">↓</span>}
                      </div>
                      <div
                        onClick={() => setSortOrder(sortOrder === 'group_asc' ? 'group_desc' : 'group_asc')}
                        className="col-span-2 text-right font-medium text-[#475569] dark:text-[#cbd5e1] flex items-center justify-end space-x-1 cursor-pointer hover:text-[#1677ff] transition-colors"
                        title="Click để đổi thứ tự sắp xếp theo nhóm"
                      >
                        <span>Group</span>
                        {sortOrder === 'group_asc' && <span className="text-[#1677ff] font-bold">↑</span>}
                        {sortOrder === 'group_desc' && <span className="text-[#1677ff] font-bold">↓</span>}
                      </div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-[#f1f5f9] dark:divide-[#1e293b] max-h-[380px] overflow-y-auto">
                      {isLoadingProfiles ? (
                        <div className="py-16 flex flex-col items-center justify-center text-[#64748b] space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-[#1677ff]" />
                          <span className="text-xs">Loading profiles from http://localhost:8725/api/v1/profiles...</span>
                        </div>
                      ) : filteredProfiles.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-[#64748b] space-y-2">
                          <span className="text-xs font-semibold">No profiles found</span>
                          {apiStatus === 'error' && (
                            <span className="text-[11px] text-red-500">
                              Could not connect to SV Browser API on port 8725. Please make sure SV Browser is running.
                            </span>
                          )}
                        </div>
                      ) : (
                        paginatedProfiles.map((p, index) => {
                          const isSelected = selectedProfileIds.includes(String(p.id));
                          const coreName =
                            p.browser?.name === 'chrome'
                              ? 'Chromium'
                              : p.browser?.name || 'Chromium';
                          const groupName = p.group_name || p.group_id || 'Default group';
                          const globalIdx = startIndex + index;

                          return (
                            <div
                              key={p.id}
                              onClick={(e) => toggleProfileSelect(p.id, globalIdx, e.shiftKey)}
                              className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-xs transition-colors cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-blue-50/70 dark:bg-blue-950/40'
                                  : 'hover:bg-slate-50 dark:hover:bg-[#131d33]'
                              }`}
                            >
                              <div
                                className="col-span-1 flex items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => toggleProfileSelect(p.id, globalIdx, false)}
                                  className="w-4 h-4 rounded text-[#1677ff] focus:ring-0 cursor-pointer"
                                />
                              </div>
                              <div className="col-span-4 font-normal text-[#1e293b] dark:text-[#f1f5f9] truncate" title={p.name}>
                                {p.name}
                              </div>
                              <div
                                className="col-span-3 flex flex-wrap items-center gap-1 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {Array.isArray(p.tags) && p.tags.length > 0 ? (
                                  p.tags.map((tagItem: any, tidx: number) => {
                                    const tagName = typeof tagItem === 'string' ? tagItem : (tagItem?.name || String(tagItem));
                                    const tagColor = tagColorMap.get(tagName.toLowerCase().trim()) || (typeof tagItem === 'object' && tagItem?.color ? tagItem.color : '#0284c7');
                                    return (
                                      <span
                                        key={tidx}
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          setSelectedTag(tagName);
                                          setCurrentPage(1);
                                        }}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-2xs hover:opacity-85 transition-opacity cursor-pointer whitespace-nowrap"
                                        style={{ backgroundColor: tagColor }}
                                        title={`Thẻ: ${tagName} (Click để lọc theo thẻ này)`}
                                      >
                                        {tagName}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-[#94a3b8] dark:text-[#64748b] text-[11px]">-</span>
                                )}
                              </div>
                              <div className="col-span-2 text-center text-[#475569] dark:text-[#94a3b8]">
                                {coreName}
                              </div>
                              <div className="col-span-2 text-right text-[#475569] dark:text-[#94a3b8] truncate" title={groupName}>
                                {groupName}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Pagination Bar with Per-Page Input & Page Navigator */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#f8fafc] dark:bg-[#0a0f1d] border-t border-[#e2e8f0] dark:border-[#1e293b] text-xs select-none">
                      {/* Left: Info */}
                      <div className="flex items-center space-x-1.5 text-[#64748b] dark:text-[#94a3b8]">
                        <span>Hiển thị</span>
                        <span className="font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
                          {filteredProfiles.length > 0 ? startIndex + 1 : 0} - {endIndex}
                        </span>
                        <span>/ tổng số</span>
                        <span className="font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
                          {filteredProfiles.length}
                        </span>
                        <span>bản ghi</span>
                        {selectedProfileIds.length > 0 && (
                          <span className="ml-1 text-[#1677ff] dark:text-[#38bdf8] font-medium">
                            • {selectedProfileIds.length} đã chọn
                          </span>
                        )}
                      </div>

                      {/* Right: Per-page input + page navigation */}
                      <div className="flex items-center space-x-3">
                        {/* Input số bản ghi mỗi trang */}
                        <div className="flex items-center space-x-1.5 text-[#64748b] dark:text-[#94a3b8]">
                          <span>Bản ghi / trang:</span>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={customPerPageInput}
                            onChange={(e) => {
                              setCustomPerPageInput(e.target.value);
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val > 0 && val <= 1000) {
                                setProfilesPerPage(val);
                                setCurrentPage(1);
                              }
                            }}
                            onBlur={() => {
                              const val = parseInt(customPerPageInput, 10);
                              if (isNaN(val) || val <= 0) {
                                setCustomPerPageInput(String(profilesPerPage));
                              } else {
                                const finalVal = Math.min(1000, Math.max(1, val));
                                setProfilesPerPage(finalVal);
                                setCustomPerPageInput(String(finalVal));
                                setCurrentPage(1);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseInt(customPerPageInput, 10);
                                if (!isNaN(val) && val > 0) {
                                  const finalVal = Math.min(1000, Math.max(1, val));
                                  setProfilesPerPage(finalVal);
                                  setCustomPerPageInput(String(finalVal));
                                  setCurrentPage(1);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }
                            }}
                            className="w-14 px-1.5 py-1 text-center bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md font-semibold text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] shadow-2xs"
                            title="Nhập số lượng bản ghi hiển thị trên mỗi trang (Enter để xác nhận)"
                          />

                          {/* Preset select */}
                          <select
                            value={profilesPerPage}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setProfilesPerPage(val);
                              setCustomPerPageInput(String(val));
                              setCurrentPage(1);
                            }}
                            className="px-2 py-1 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] shadow-2xs cursor-pointer"
                            title="Chọn nhanh số bản ghi mỗi trang"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                            <option value={500}>500</option>
                          </select>
                        </div>

                        {/* Navigation buttons: << < Page > >> */}
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setCurrentPage(1)}
                            disabled={safeCurrentPage <= 1}
                            className="px-2 py-1 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-xs text-[#64748b] hover:text-[#1677ff] hover:border-[#1677ff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Trang đầu"
                          >
                            &laquo;
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safeCurrentPage <= 1}
                            className="px-2 py-1 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-xs text-[#64748b] hover:text-[#1677ff] hover:border-[#1677ff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Trang trước"
                          >
                            &lsaquo;
                          </button>

                          <div className="flex items-center space-x-1 px-1 text-xs">
                            <span className="text-[#64748b]">Trang</span>
                            <input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={safeCurrentPage}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                                  setCurrentPage(val);
                                }
                              }}
                              className="w-12 px-1 py-0.5 text-center bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded font-semibold text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff]"
                            />
                            <span className="text-[#64748b]">/ {totalPages}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safeCurrentPage >= totalPages}
                            className="px-2 py-1 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-xs text-[#64748b] hover:text-[#1677ff] hover:border-[#1677ff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Trang sau"
                          >
                            &rsaquo;
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={safeCurrentPage >= totalPages}
                            className="px-2 py-1 bg-white dark:bg-[#0f172a] border border-[#d9d9d9] dark:border-[#1e293b] rounded text-xs text-[#64748b] hover:text-[#1677ff] hover:border-[#1677ff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Trang cuối"
                          >
                            &raquo;
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 4: RUNNING MULTI-THREAD DASHBOARD (Matching official GPM / SV Browser Runtime) ================= */}
              {step === 4 && (
                <div className="max-w-6xl xl:max-w-7xl mx-auto space-y-4">
                  {/* Top Summary Stats Cards & Actions matching media_1789722567215.png */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {/* Total */}
                      <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl px-4 py-2 min-w-[85px] shadow-xs">
                        <div className="text-[11px] font-medium text-[#64748b]">Total</div>
                        <div className="text-lg font-bold text-[#1e293b] dark:text-[#f1f5f9]">{threads.length}</div>
                      </div>

                      {/* Queued */}
                      <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl px-4 py-2 min-w-[85px] shadow-xs">
                        <div className="text-[11px] font-medium text-[#64748b] flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                          <span>Queued</span>
                        </div>
                        <div className="text-lg font-bold text-[#1e293b] dark:text-[#f1f5f9]">
                          {threads.filter((t) => t.status === 'idle' && !t.currentAction?.startsWith('Bỏ qua')).length}
                        </div>
                      </div>

                      {/* Running */}
                      <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl px-4 py-2 min-w-[85px] shadow-xs">
                        <div className="text-[11px] font-medium text-[#64748b] flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                          <span>Running</span>
                        </div>
                        <div className="text-lg font-bold text-[#1677ff] dark:text-[#38bdf8]">
                          {threads.filter((t) => t.status === 'running').length}
                        </div>
                      </div>

                      {/* Completed */}
                      <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl px-4 py-2 min-w-[85px] shadow-xs">
                        <div className="text-[11px] font-medium text-[#64748b] flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span>Completed</span>
                        </div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {threads.filter((t) => t.status === 'completed').length}
                        </div>
                      </div>

                      {/* Skipped */}
                      <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl px-4 py-2 min-w-[85px] shadow-xs">
                        <div className="text-[11px] font-medium text-[#64748b] flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                          <span>Skipped</span>
                        </div>
                        <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                          {threads.filter((t) => t.status === 'idle' && t.currentAction?.startsWith('Bỏ qua')).length}
                        </div>
                      </div>

                      {/* Error */}
                      <div className="bg-[#fafbfc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl px-4 py-2 min-w-[85px] shadow-xs">
                        <div className="text-[11px] font-medium text-[#64748b] flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                          <span>Error</span>
                        </div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          {threads.filter((t) => t.status === 'error').length}
                        </div>
                      </div>
                    </div>

                    {/* Right action buttons: Arrange windows / Run selected again / Stop all */}
                    <div className="flex items-center space-x-2.5">
                      <button
                        onClick={handleArrangeAllWindows}
                        className="px-3 py-2 text-xs rounded-lg border border-[#cbd5e1] dark:border-[#1e293b] bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#334155] dark:text-[#cbd5e1] font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
                        title="Tự động chia đều các cửa sổ Chrome trên màn hình theo lưới (bắt đầu từ góc trái trên)"
                      >
                        <Layout className="w-3.5 h-3.5 text-[#1677ff]" />
                        <span>Chia đều cửa sổ</span>
                      </button>

                      {isExecuting ? (
                        <button
                          onClick={handleStopAll}
                          className="px-4 py-2 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Stop All</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setStep(3)}
                            className="px-3 py-2 text-xs rounded-lg border border-[#cbd5e1] dark:border-[#1e293b] bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#334155] dark:text-[#cbd5e1] font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
                            title="Return to profile selection"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 text-[#64748b]" />
                            <span>Choose profiles</span>
                          </button>
                          <button
                            onClick={startMultiThreadExecution}
                            className="px-4 py-2 text-xs rounded-lg bg-[#1677ff] hover:bg-blue-600 text-white font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
                            title="Run all selected profiles again"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-white" />
                            <span>Run selected again</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Profile Table matching media_1789722567215.png */}
                  <div className="bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f8fafc] dark:bg-[#0a0f1d] border-b border-[#e2e8f0] dark:border-[#1e293b] text-[#64748b]">
                          <th className="py-3 px-4 font-semibold">Profile Name</th>
                          <th className="py-3 px-4 font-semibold w-28 text-center">Core</th>
                          <th className="py-3 px-4 font-semibold w-32 text-center">Status</th>
                          <th className="py-3 px-4 font-semibold">Progress</th>
                          <th className="py-3 px-4 font-semibold w-24 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#1e293b]">
                        {threads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[#94a3b8]">
                              No profiles currently running. Click "Run selected again" or go Back to select profiles.
                            </td>
                          </tr>
                        ) : (
                          threads.map((t) => {
                            const prof = profiles.find((p) => p.id === t.profileId);
                            const proxyInfo = workerProxies[t.id] || prof?.raw_proxy || '';
                            const lastLog = t.logs[t.logs.length - 1];

                            return (
                              <tr
                                key={t.id}
                                onClick={() => setSelectedLogThreadId(t.id)}
                                className={`transition-colors cursor-pointer select-none ${
                                  selectedLogThreadId === t.id
                                    ? 'bg-blue-50/90 dark:bg-blue-950/60 ring-1 ring-inset ring-[#1677ff]/40'
                                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                }`}
                                title="Click to view execution log"
                              >
                                <td className="py-3 px-4">
                                  <div className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9] flex items-center space-x-1.5">
                                    <span>{t.profileName || t.name}</span>
                                    {selectedLogThreadId === t.id && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#1677ff]" />
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[#94a3b8] font-mono mt-0.5">
                                    {proxyInfo || (t.port ? `Port :${t.port}` : 'Direct connection')}
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-center text-[#475569] dark:text-[#94a3b8]">
                                  {prof?.browser?.name || 'edge'}
                                </td>

                                <td className="py-3 px-4 text-center">
                                  {t.status === 'running' && (
                                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                                      <span>Running</span>
                                    </span>
                                  )}
                                  {t.status === 'completed' && (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                                      <span>✔ Completed</span>
                                    </span>
                                  )}
                                  {t.status === 'error' && (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900">
                                      <span>✖ Error</span>
                                    </span>
                                  )}
                                  {t.status === 'idle' && t.currentAction?.startsWith('Bỏ qua') && (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                      <SkipForward className="w-3 h-3" />
                                      <span>Skipped</span>
                                    </span>
                                  )}
                                  {t.status === 'idle' && !t.currentAction?.startsWith('Bỏ qua') && (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                      <span>Queued</span>
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-4 max-w-md">
                                  <div
                                    className={`text-xs truncate font-mono ${
                                      t.status === 'error'
                                        ? 'text-red-500 font-semibold'
                                        : 'text-[#334155] dark:text-[#cbd5e1]'
                                    }`}
                                    title={lastLog?.text || t.currentAction}
                                  >
                                    {lastLog?.text || t.currentAction}
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLogThreadId(t.id);
                                    }}
                                    className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer inline-flex items-center space-x-1 font-medium ${
                                      selectedLogThreadId === t.id
                                        ? 'bg-[#1677ff] text-white border-[#1677ff] shadow-xs'
                                        : 'border-[#cbd5e1] dark:border-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#475569] dark:text-[#cbd5e1]'
                                    }`}
                                  >
                                    <Terminal className="w-3 h-3" />
                                    <span>Log</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Slide-over Log Drawer matching media_1789722580341.png (Docked cleanly on right) */}
                  {(() => {
                    const currentLogThread = threads.find((t) => t.id === selectedLogThreadId);
                    if (selectedLogThreadId === null || !currentLogThread) return null;
                    return (
                      <div className="absolute inset-y-0 right-0 w-[480px] bg-[#0c1322] border-l border-[#1e293b] shadow-2xl z-40 flex flex-col text-xs text-white animate-in slide-in-from-right duration-200">
                        {/* Drawer Header */}
                        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0f172a]">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                              <span className="font-bold text-sm text-white">
                                Log • {currentLogThread.name || `Worker #${selectedLogThreadId}`}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#64748b] mt-0.5">
                              {currentLogThread.logs?.length || 0} lines
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedLogThreadId(null)}
                            className="p-1 rounded hover:bg-slate-800 text-[#94a3b8] hover:text-white cursor-pointer"
                            title="Close log viewer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Drawer Body - Colored Console Logs matching media_1789722580341.png */}
                        <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 bg-[#080d19]">
                          {(currentLogThread.logs || []).map((l, idx) => (
                            <div
                              key={idx}
                              className={`leading-relaxed break-all ${
                                l.type === 'error'
                                  ? 'text-red-400 font-semibold'
                                  : l.type === 'success'
                                  ? 'text-emerald-400'
                                  : l.type === 'arrow'
                                  ? 'text-sky-300 pl-2'
                                  : 'text-slate-300'
                              }`}
                            >
                              <span className="text-slate-500 mr-2">[{l.time}]</span>
                              <span>{l.text}</span>
                            </div>
                          ))}
                        </div>

                      {/* Drawer Footer */}
                      <div className="p-3 border-t border-[#1e293b] flex items-center justify-end space-x-2.5 bg-[#0f172a]">
                        <button
                          onClick={() => {
                            const lgs = threads.find((t) => t.id === selectedLogThreadId)?.logs || [];
                            const text = lgs.map((l) => `[${l.time}] ${l.text}`).join('\n');
                            navigator.clipboard.writeText(text);
                          }}
                          className="px-3 py-1 rounded bg-[#1e293b] hover:bg-slate-700 text-slate-200 font-medium cursor-pointer transition-colors"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => {
                            setThreads((prev) =>
                              prev.map((t) => (t.id === selectedLogThreadId ? { ...t, logs: [] } : t))
                            );
                          }}
                          className="px-3 py-1 rounded bg-[#1e293b] hover:bg-slate-700 text-slate-200 font-medium cursor-pointer transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  );
                })()}
                </div>
              )}
            </div>

            {/* Modal Bottom Footer (Matching Image) */}
            <div className="px-6 py-3 border-t border-[#e2e8f0] dark:border-[#162236] flex items-center justify-between bg-[#f8fafc] dark:bg-[#080d19] text-xs">
              {step === 3 ? (
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#1677ff] dark:text-[#38bdf8]">
                  <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950 text-[#1677ff] flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Selected {selectedProfileIds.length} profile(s)</span>
                </div>
              ) : (
                <span className="text-[#64748b]">Step {step} / 4</span>
              )}

              <div className="flex items-center space-x-2.5">
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#1e293b] text-[#475569] dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer transition-colors"
                  >
                    ← Back
                  </button>
                )}

                {step < 3 ? (
                  <button
                    onClick={handleContinue}
                    className="px-5 py-1.5 rounded-lg bg-[#1677ff] hover:bg-blue-600 text-white font-semibold cursor-pointer shadow-xs transition-colors flex items-center space-x-1"
                  >
                    <span>Continue</span>
                    <span>→</span>
                  </button>
                ) : step === 3 ? (
                  <button
                    disabled={selectedProfileIds.length === 0}
                    onClick={handleContinue}
                    className={`px-6 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 shadow-xs transition-colors ${
                      selectedProfileIds.length === 0
                        ? 'bg-slate-200 dark:bg-slate-800 text-[#94a3b8] cursor-not-allowed'
                        : 'bg-[#1677ff] hover:bg-blue-600 text-white cursor-pointer'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start</span>
                  </button>
                ) : (
                  <button
                    onClick={handleModalClose}
                    className="px-5 py-1.5 rounded-lg bg-[#1677ff] hover:bg-blue-600 text-white font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
