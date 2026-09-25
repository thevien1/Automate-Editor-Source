import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ProjectData, ProjectRuntimeConfig, ActionNode, BaseNode, NormalBlockNode, BlockNode, WorkflowNode, ForBlockNode, IfBlockNode, WhileBlockNode, EditorFile } from '../types/gscript';
import { RecentProject, ActionDefinition, ActiveScreen } from '../types/ui';
import { createDefaultProject, createDefaultNormalBlock, generateGuid, serializeRawInput } from '../utils/gpmUtils';
import { UpdateInfo, checkForAppUpdates } from '../services/updateService';
import { normalizeWorkflowNodes, nodesToJsonString } from '../utils/jsonWorkflowUtils';

export const BROWSER_SYSTEM_VARIABLES = [
  'profileName',
  'profileId',
  'profileProxy',
  'loopIndex',
  'threadId',
  'port',
];

export const EXCEL_VARIABLES = [
  'col_A',
  'col_B',
  'col_C',
  'col_D',
  'col_E',
  'col_F',
  'col_G',
  'col_H',
  'col_I',
  'col_J',
  'col_K',
  'col_L',
  'col_M',
  'col_N',
  'col_O',
  'col_P',
  'col_Q',
  'col_R',
  'col_S',
  'col_T',
  'col_U',
  'col_V',
  'col_W',
  'col_X',
  'col_Y',
  'col_Z',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'excel_row',
  'inputExcel',
  'inputExcelFileLocation',
  'inputExcelTotalRows',
  'inputExcelCurrentRow',
];

export const TXT_VARIABLES = [
  'txt_line',
  'line',
  'line_1',
  'line_2',
  'line_3',
  'line_4',
  'line_5',
];

export const COMMON_DATA_VARIABLES = [
  'email',
  'password',
  'code_2fa',
  'url',
  'username',
  'two_factor_code',
  'otp',
  'phone',
  'cookie',
  'token',
];

export const SYSTEM_VARIABLES = [
  ...BROWSER_SYSTEM_VARIABLES,
  ...EXCEL_VARIABLES,
  ...TXT_VARIABLES,
  ...COMMON_DATA_VARIABLES,
];

export const extractProjectOutputVariables = (project: ProjectData | null): string[] => {
  if (!project || !project.script) return [];
  const vars = new Set<string>();

  const traverse = (node: WorkflowNode, prefix?: string) => {
    if (!node) return;
    if ('output_variable_name' in node && (node as ActionNode).output_variable_name) {
      const name = (node as ActionNode).output_variable_name?.trim();
      if (name) {
        // Support comma-separated variable names: e.g. "email, password, code_2fa"
        const parts = name.split(',').map((s) => s.trim()).filter(Boolean);
        for (const p of parts) {
          const clean = p.startsWith('$') ? p.substring(1) : p;
          if (clean) {
            vars.add(clean);
            if (prefix) {
              vars.add(`${prefix}_${clean}`);
            }
          }
        }
      }
    }
    if ('nodes' in node && Array.isArray((node as any).nodes)) {
      for (const child of (node as any).nodes) {
        traverse(child, prefix);
      }
    }
  };

  if (project.script.before_init) traverse(project.script.before_init);
  if (project.script.main_logic) traverse(project.script.main_logic);
  if (project.script.after_quit) traverse(project.script.after_quit);

  if (project.subWorkflows) {
    for (const [subName, subScript] of Object.entries(project.subWorkflows)) {
      if (subScript.before_init) traverse(subScript.before_init, subName);
      if (subScript.main_logic) traverse(subScript.main_logic, subName);
      if (subScript.after_quit) traverse(subScript.after_quit, subName);
    }
  }

  return Array.from(vars);
};

interface ProjectContextType {
  screen: ActiveScreen;
  setScreen: (screen: ActiveScreen) => void;
  theme: 'light' | 'dark';
  themePreference: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  currentProject: ProjectData | null;
  recentProjects: RecentProject[];
  activeWorkflowTab: string;
  setActiveWorkflowTab: (tab: string) => void;
  activeScript: EditorFile | null;
  createSubWorkflow: (name: string) => Promise<{ success: boolean; error?: string }>;
  deleteSubWorkflow: (name: string) => Promise<void>;
  importSubWorkflow: (name: string, scriptData: any) => Promise<{ success: boolean; error?: string }>;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedBlockKey: 'before_init' | 'main_logic' | 'after_quit';
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;
  showSaveToast: boolean;
  setShowSaveToast: (show: boolean) => void;
  toastInfo: { title: string; message: string } | null;
  showToast: (title: string, message: string) => void;
  showTestModal: boolean;
  setShowTestModal: (show: boolean) => void;
  showRuntimeModal: boolean;
  setShowRuntimeModal: (show: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  showUpdateModal: boolean;
  setShowUpdateModal: (show: boolean) => void;
  showJsonModal: boolean;
  setShowJsonModal: (show: boolean) => void;
  jsonModalMode: 'export' | 'import';
  setJsonModalMode: (mode: 'export' | 'import') => void;
  insertNodesFromJson: (jsonStr: string, targetBlock?: 'before_init' | 'main_logic' | 'after_quit') => { success: boolean; count: number; error?: string };
  updateInfo: UpdateInfo | null;
  isCheckingUpdate: boolean;
  checkAppUpdate: (manual?: boolean) => Promise<UpdateInfo | null>;
  allVariables: string[];
  customVariables: string[];
  createNewProject: (name: string, folderPath: string, meta?: { description?: string | null; author_info?: string; version?: string }) => Promise<void>;
  openProjectByPath: (path: string, name?: string) => Promise<void>;
  removeRecentProject: (pathOrId: string) => void;
  clearRecentProjects: () => void;
  closeProject: () => void;
  saveProject: () => Promise<void>;
  updateRuntimeConfig: (config: Partial<ProjectRuntimeConfig>) => void;
  selectNode: (id: string | null, blockKey?: 'before_init' | 'main_logic' | 'after_quit', isMulti?: boolean, isRange?: boolean) => void;
  selectAllNodes: () => void;
  updateNode: (id: string, updates: Partial<any>) => void;
  insertActionOrBlock: (actionDef: ActionDefinition, targetId?: string | null, position?: 'before' | 'after' | 'inside') => void;
  deleteSelectedNode: () => void;
  getSelectedNode: () => WorkflowNode | null;
  toggleBlockExpand: (blockId: string) => void;
  moveNode: (draggedId: string, targetId: string, position?: 'before' | 'after' | 'inside' | number) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  copySelectedNode: () => void;
  cutSelectedNode: () => void;
  pasteCopiedNode: () => void;
  duplicateSelectedNode: () => void;
  clearWorkflow: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<ActiveScreen>('home');
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>(() => {
    const savedPref = localStorage.getItem('gpm_theme_preference');
    if (savedPref === 'light' || savedPref === 'dark' || savedPref === 'system') return savedPref;
    const savedTheme = localStorage.getItem('gpm_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return 'light';
  });

  const computeEffectiveTheme = (pref: 'light' | 'dark' | 'system'): 'light' | 'dark' => {
    if (pref === 'system') {
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return pref;
  };

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => computeEffectiveTheme(themePreference));

  const setTheme = (newPref: 'light' | 'dark' | 'system') => {
    const eff = computeEffectiveTheme(newPref);
    setThemePreference(newPref);
    setThemeState(eff);
    localStorage.setItem('gpm_theme_preference', newPref);
    localStorage.setItem('gpm_theme', eff);
    if (eff === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Sync theme changes
  useEffect(() => {
    const eff = computeEffectiveTheme(themePreference);
    setThemeState(eff);
    localStorage.setItem('gpm_theme_preference', themePreference);
    localStorage.setItem('gpm_theme', eff);
    if (eff === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themePreference]);

  // Listen to OS system theme changes
  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const currentPref = localStorage.getItem('gpm_theme_preference') || 'light';
      if (currentPref === 'system') {
        const eff = e.matches ? 'dark' : 'light';
        setThemeState(eff);
        localStorage.setItem('gpm_theme', eff);
        if (eff === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => {
    const saved = localStorage.getItem('gpm_recent_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedBlockKey, setSelectedBlockKey] = useState<'before_init' | 'main_logic' | 'after_quit'>('main_logic');
  const [activeWorkflowTab, setActiveWorkflowTabState] = useState<string>('main');

  const getActiveScript = (proj: ProjectData | null = currentProject, tab: string = activeWorkflowTab): EditorFile | null => {
    if (!proj) return null;
    if (tab === 'main') return proj.script;
    return proj.subWorkflows?.[tab] || null;
  };

  const activeScript = getActiveScript();

  const applyScriptUpdate = (newScript: EditorFile) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      if (activeWorkflowTab === 'main') {
        return { ...prev, script: newScript };
      }
      return {
        ...prev,
        subWorkflows: {
          ...(prev.subWorkflows || {}),
          [activeWorkflowTab]: newScript,
        },
      };
    });
  };

  const setActiveWorkflowTab = (tab: string) => {
    setActiveWorkflowTabState(tab);
    setUndoStack([]);
    setRedoStack([]);
    const script = tab === 'main' ? currentProject?.script : currentProject?.subWorkflows?.[tab];
    const defaultNodeId = script?.main_logic?.id || script?.before_init?.id || null;
    setSelectedNodeId(defaultNodeId);
    setSelectedNodeIds(defaultNodeId ? [defaultNodeId] : []);
    setSelectedBlockKey('main_logic');
  };

  const createSubWorkflow = async (name: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'File name cannot be empty' };
    }
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
      return { success: false, error: 'Invalid characters in file name' };
    }
    if (trimmed.toLowerCase() === 'main' || trimmed.toLowerCase() === 'src') {
      return { success: false, error: 'Cannot use reserved name "main" or "src"' };
    }
    if (currentProject?.subWorkflows && currentProject.subWorkflows[trimmed]) {
      return { success: false, error: `Workflow "${trimmed}" already exists` };
    }

    const newSubScript: EditorFile = {
      $type: 'GPMAutomateEditor.Models.Editor, GPMAutomateEditor.Models',
      before_init: createDefaultNormalBlock('Before browser opened'),
      main_logic: createDefaultNormalBlock('Normal block'),
      after_quit: createDefaultNormalBlock('After browser closed'),
      name: trimmed,
    };

    const updatedSubWorkflows = {
      ...(currentProject?.subWorkflows || {}),
      [trimmed]: newSubScript,
    };

    const updatedProject: ProjectData = {
      ...currentProject!,
      subWorkflows: updatedSubWorkflows,
    };

    setCurrentProject(updatedProject);
    setActiveWorkflowTabState(trimmed);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedNodeId(newSubScript.main_logic.id);
    setSelectedNodeIds([newSubScript.main_logic.id]);
    setSelectedBlockKey('main_logic');

    if ((window as any).electronAPI?.saveProjectToDisk) {
      await (window as any).electronAPI.saveProjectToDisk(updatedProject);
    }
    if (updatedProject.folderPath) {
      localStorage.setItem(`gpm_project_${updatedProject.folderPath}`, JSON.stringify(updatedProject));
    }

    showToast('Created', `Created workflow file ${trimmed}.gscript`);
    return { success: true };
  };

  const deleteSubWorkflow = async (name: string) => {
    if (!currentProject || !currentProject.subWorkflows || !currentProject.subWorkflows[name]) return;

    const nextSubWorkflows = { ...currentProject.subWorkflows };
    delete nextSubWorkflows[name];

    const updatedProject: ProjectData = {
      ...currentProject,
      subWorkflows: nextSubWorkflows,
    };

    setCurrentProject(updatedProject);

    if (activeWorkflowTab === name) {
      setActiveWorkflowTabState('main');
      const defaultNodeId = updatedProject.script?.main_logic?.id || null;
      setSelectedNodeId(defaultNodeId);
      setSelectedNodeIds(defaultNodeId ? [defaultNodeId] : []);
      setSelectedBlockKey('main_logic');
    }

    if ((window as any).electronAPI?.saveProjectToDisk) {
      await (window as any).electronAPI.saveProjectToDisk(updatedProject);
    }
    if (updatedProject.folderPath) {
      localStorage.setItem(`gpm_project_${updatedProject.folderPath}`, JSON.stringify(updatedProject));
    }

    showToast('Deleted', `Deleted workflow ${name}`);
  };

  const importSubWorkflow = async (name: string, scriptData: any): Promise<{ success: boolean; error?: string }> => {
    if (!currentProject) return { success: false, error: 'No active project' };
    let baseName = name.replace(/\.gscript$/i, '').replace(/\.json$/i, '').trim();
    if (!baseName || baseName.toLowerCase() === 'main' || baseName.toLowerCase() === 'src') {
      baseName = `imported_${Date.now()}`;
    }

    let finalName = baseName;
    let counter = 1;
    while (currentProject.subWorkflows && currentProject.subWorkflows[finalName]) {
      finalName = `${baseName}_${counter++}`;
    }

    let parsed: any;
    try {
      parsed = typeof scriptData === 'string' ? JSON.parse(scriptData) : scriptData;
      if (!parsed.main_logic) {
        if (Array.isArray(parsed)) {
          parsed = {
            $type: 'GPMAutomateEditor.Models.Editor, GPMAutomateEditor.Models',
            before_init: createDefaultNormalBlock('Before browser opened'),
            main_logic: {
              ...createDefaultNormalBlock('Normal block'),
              nodes: parsed,
            },
            after_quit: createDefaultNormalBlock('After browser closed'),
            name: finalName,
          };
        } else if ('nodes' in parsed) {
          parsed = {
            $type: 'GPMAutomateEditor.Models.Editor, GPMAutomateEditor.Models',
            before_init: createDefaultNormalBlock('Before browser opened'),
            main_logic: parsed,
            after_quit: createDefaultNormalBlock('After browser closed'),
            name: finalName,
          };
        } else {
          parsed = {
            $type: 'GPMAutomateEditor.Models.Editor, GPMAutomateEditor.Models',
            before_init: createDefaultNormalBlock('Before browser opened'),
            main_logic: createDefaultNormalBlock('Normal block'),
            after_quit: createDefaultNormalBlock('After browser closed'),
            name: finalName,
          };
        }
      }
      parsed.name = finalName;
    } catch (err: any) {
      return { success: false, error: `Invalid script format: ${err.message}` };
    }

    const updatedSubWorkflows = {
      ...(currentProject.subWorkflows || {}),
      [finalName]: parsed,
    };

    const updatedProject: ProjectData = {
      ...currentProject,
      subWorkflows: updatedSubWorkflows,
    };

    setCurrentProject(updatedProject);
    setActiveWorkflowTabState(finalName);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedNodeId(parsed.main_logic?.id || null);
    setSelectedNodeIds(parsed.main_logic?.id ? [parsed.main_logic.id] : []);
    setSelectedBlockKey('main_logic');

    if ((window as any).electronAPI?.saveProjectToDisk) {
      await (window as any).electronAPI.saveProjectToDisk(updatedProject);
    }
    if (updatedProject.folderPath) {
      localStorage.setItem(`gpm_project_${updatedProject.folderPath}`, JSON.stringify(updatedProject));
    }

    showToast('Imported', `Imported workflow file ${finalName}.gscript`);
    return { success: true };
  };

  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [showSaveToast, setShowSaveToast] = useState<boolean>(false);
  const [toastInfo, setToastInfo] = useState<{ title: string; message: string } | null>(null);

  const showToast = (title: string, message: string) => {
    setToastInfo({ title, message });
    setShowSaveToast(true);
  };

  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [showRuntimeModal, setShowRuntimeModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [jsonModalMode, setJsonModalMode] = useState<'export' | 'import'>('export');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);

  const checkAppUpdate = async (manual: boolean = false): Promise<UpdateInfo | null> => {
    setIsCheckingUpdate(true);
    try {
      const res = await checkForAppUpdates();
      setUpdateInfo(res);
      if (manual && res.hasUpdate) {
        setShowUpdateModal(true);
      }
      return res;
    } catch {
      return null;
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    // Check update on startup after 2 seconds
    const timer = setTimeout(() => {
      checkAppUpdate(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const [undoStack, setUndoStack] = useState<EditorFile[]>([]);
  const [redoStack, setRedoStack] = useState<EditorFile[]>([]);
  const lastUpdateNodeIdRef = useRef<string | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('gpm_accent_color') || '#1677ff';
  });

  // Sync accent color
  useEffect(() => {
    localStorage.setItem('gpm_accent_color', accentColor);
    document.documentElement.style.setProperty('--primary-color', accentColor);
  }, [accentColor]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    localStorage.setItem('gpm_recent_projects', JSON.stringify(recentProjects));
  }, [recentProjects]);

  // Automatically verify that recent project paths still exist on disk (prunes ghost projects from other machines/deleted folders)
  useEffect(() => {
    const pruneNonExistent = async () => {
      if ((window as any).electronAPI?.checkPathExists && recentProjects.length > 0) {
        try {
          const verified: RecentProject[] = [];
          for (const p of recentProjects) {
            if (p && p.path) {
              const exists = await (window as any).electronAPI.checkPathExists(p.path);
              if (exists) verified.push(p);
            }
          }
          if (verified.length !== recentProjects.length) {
            setRecentProjects(verified);
            localStorage.setItem('gpm_recent_projects', JSON.stringify(verified));
          }
        } catch {}
      }
    };
    pruneNonExistent();
  }, []);

  const removeRecentProject = (pathOrId: string) => {
    setRecentProjects((prev) => {
      const next = prev.filter((p) => p.id !== pathOrId && p.path !== pathOrId);
      localStorage.setItem('gpm_recent_projects', JSON.stringify(next));
      return next;
    });
  };

  const clearRecentProjects = () => {
    setRecentProjects([]);
    localStorage.removeItem('gpm_recent_projects');
  };

  const createNewProject = async (
    name: string,
    folderPath: string,
    meta?: { description?: string | null; author_info?: string; version?: string }
  ) => {
    const newProj = createDefaultProject(name, folderPath);
    if (meta?.description !== undefined) newProj.info.description = meta.description;
    if (meta?.author_info) newProj.info.author_info = meta.author_info;
    if (meta?.version) newProj.info.version = meta.version;

    // Default 3 blocks
    newProj.script.before_init.expanded = false;
    newProj.script.main_logic.expanded = true;
    newProj.script.after_quit.expanded = false;

    // Save physically to disk if in Electron
    if ((window as any).electronAPI?.saveProjectToDisk) {
      await (window as any).electronAPI.saveProjectToDisk(newProj);
    }
    localStorage.setItem(`gpm_project_${folderPath}`, JSON.stringify(newProj));

    setCurrentProject(newProj);

    // Update Recents
    const existing = recentProjects.filter(p => p.path !== folderPath);
    setRecentProjects([
      { id: generateGuid(), name, path: folderPath, lastOpened: new Date().toISOString() },
      ...existing,
    ]);

    setScreen('editor');
    setActiveWorkflowTabState('main');
    setUndoStack([]);
    setRedoStack([]);
    // Default select main logic block
    setSelectedNodeId(newProj.script.main_logic.id);
    setSelectedNodeIds([newProj.script.main_logic.id]);
    setSelectedBlockKey('main_logic');
  };

  const openProjectByPath = async (path: string, name?: string) => {
    let proj: ProjectData | null = null;

    if ((window as any).electronAPI?.readProjectFromDisk) {
      const res = await (window as any).electronAPI.readProjectFromDisk(path);
      if (res.success && res.project) {
        proj = res.project;
      }
    }

    if (!proj) {
      const saved = localStorage.getItem(`gpm_project_${path}`);
      if (saved) {
        proj = JSON.parse(saved);
      }
    }

    if (!proj) {
      const projName = name || path.split('\\').pop() || 'Project';
      proj = createDefaultProject(projName, path);
    }

    // Try restoring runtimeConfig from scoped localStorage if not yet set
    if (proj && !proj.runtimeConfig) {
      try {
        const localCfg = localStorage.getItem(`gpm_runtime_config_${proj.folderPath || proj.info?.id || proj.info?.name}`);
        if (localCfg) {
          proj.runtimeConfig = JSON.parse(localCfg);
        }
      } catch {}
    }

    setCurrentProject(proj);
    setScreen('editor');
    setActiveWorkflowTabState('main');
    setUndoStack([]);
    setRedoStack([]);
    const defaultNodeId = proj.script?.main_logic?.id || proj.script?.before_init?.id || null;
    setSelectedNodeId(defaultNodeId);
    setSelectedNodeIds(defaultNodeId ? [defaultNodeId] : []);
    setSelectedBlockKey('main_logic');
  };

  const closeProject = () => {
    setCurrentProject(null);
    setScreen('home');
    setActiveWorkflowTabState('main');
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setUndoStack([]);
    setRedoStack([]);
  };

  const saveProject = async () => {
    if (!currentProject) return;
    if ((window as any).electronAPI?.saveProjectToDisk) {
      await (window as any).electronAPI.saveProjectToDisk(currentProject);
    }
    localStorage.setItem(`gpm_project_${currentProject.folderPath}`, JSON.stringify(currentProject));
    showToast('Save', 'Save Successful');
  };

  const updateRuntimeConfig = (cfg: Partial<ProjectRuntimeConfig>) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updatedConfig: ProjectRuntimeConfig = { ...(prev.runtimeConfig || {}), ...cfg };
      const updatedProject: ProjectData = { ...prev, runtimeConfig: updatedConfig };

      try {
        const projectKey = prev.folderPath || prev.info?.id || prev.info?.name;
        if (projectKey) {
          localStorage.setItem(`gpm_runtime_config_${projectKey}`, JSON.stringify(updatedConfig));
        }
        if (prev.folderPath) {
          localStorage.setItem(`gpm_project_${prev.folderPath}`, JSON.stringify(updatedProject));
        }
      } catch (e) {}

      if (prev.folderPath && (window as any).electronAPI?.saveRuntimeConfig) {
        (window as any).electronAPI.saveRuntimeConfig({ folderPath: prev.folderPath, runtimeConfig: updatedConfig }).catch(() => {});
      }

      return updatedProject;
    });
  };

  // Helper to get all nodes in flat array preserving tree order
  const getAllFlatNodes = (project: ProjectData | null): WorkflowNode[] => {
    if (!project) return [];
    const script = getActiveScript(project, activeWorkflowTab);
    if (!script) return [];
    const list: WorkflowNode[] = [];
    const traverse = (node: WorkflowNode) => {
      if (!node) return;
      list.push(node);
      if ('nodes' in node && Array.isArray((node as any).nodes)) {
        for (const child of (node as any).nodes) {
          traverse(child);
        }
      }
    };
    if (script.before_init) traverse(script.before_init);
    if (script.main_logic) traverse(script.main_logic);
    if (script.after_quit) traverse(script.after_quit);
    return list;
  };

  const selectNode = (
    id: string | null,
    blockKey?: 'before_init' | 'main_logic' | 'after_quit',
    isMulti?: boolean,
    isRange?: boolean
  ) => {
    if (!id) {
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
      return;
    }

    if (blockKey) {
      setSelectedBlockKey(blockKey);
    }

    if (isMulti) {
      // Ctrl + Click: toggle this node into/out of selectedNodeIds
      setSelectedNodeIds(prev => {
        const exists = prev.includes(id);
        const next = exists ? prev.filter(x => x !== id) : [...prev, id];
        setSelectedNodeId(next.length > 0 ? next[next.length - 1] : null);
        return next;
      });
    } else if (isRange && selectedNodeId) {
      // Shift + Click: select contiguous range between previous selectedNodeId and clicked id
      const flat = getAllFlatNodes(currentProject);
      const startIdx = flat.findIndex(n => n.id === selectedNodeId);
      const endIdx = flat.findIndex(n => n.id === id);
      if (startIdx !== -1 && endIdx !== -1) {
        const low = Math.min(startIdx, endIdx);
        const high = Math.max(startIdx, endIdx);
        const rangeIds = flat.slice(low, high + 1).map(n => n.id);
        setSelectedNodeIds(rangeIds);
        setSelectedNodeId(id);
      } else {
        setSelectedNodeId(id);
        setSelectedNodeIds([id]);
      }
    } else {
      // Normal single selection
      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
    }
  };

  const selectAllNodes = () => {
    if (!currentProject) return;
    const script = getActiveScript();
    if (!script) return;
    const flat = getAllFlatNodes(currentProject);
    const rootIds = [
      script.before_init?.id,
      script.main_logic?.id,
      script.after_quit?.id,
    ].filter(Boolean);
    const selectable = flat.filter(n => !rootIds.includes(n.id)).map(n => n.id);
    if (selectable.length > 0) {
      setSelectedNodeIds(selectable);
      setSelectedNodeId(selectable[0]);
    }
  };

  // Helper to find a node recursively
  const findNodeRecursive = (nodes: WorkflowNode[], id: string): WorkflowNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if ('nodes' in n && Array.isArray((n as any).nodes)) {
        const found = findNodeRecursive((n as any).nodes, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getSelectedNode = (): WorkflowNode | null => {
    if (!currentProject || !selectedNodeId) return null;
    const script = getActiveScript();
    if (!script) return null;
    const roots = [script.before_init, script.main_logic, script.after_quit].filter(Boolean);
    for (const r of roots) {
      if (r.id === selectedNodeId) return r;
      const found = findNodeRecursive(r.nodes, selectedNodeId);
      if (found) return found;
    }
    return null;
  };

  // Helper to find parent block of an id
  const findParentBlock = (parent: WorkflowNode, childId: string): WorkflowNode | null => {
    if (!('nodes' in parent)) return null;
    const children = (parent as any).nodes as WorkflowNode[];
    for (const ch of children) {
      if (ch.id === childId) return parent;
      if ('nodes' in ch) {
        const p = findParentBlock(ch, childId);
        if (p) return p;
      }
    }
    return null;
  };

  const updateNodeRecursive = (nodes: WorkflowNode[], id: string, updates: Partial<any>): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        nodes[i] = { ...nodes[i], ...updates };
        return true;
      }
      if ('nodes' in nodes[i] && Array.isArray((nodes[i] as any).nodes)) {
        if (updateNodeRecursive((nodes[i] as any).nodes, id, updates)) {
          return true;
        }
      }
    }
    return false;
  };

  const cloneNodeWithNewIds = (node: WorkflowNode): WorkflowNode => {
    const cloned = JSON.parse(JSON.stringify(node)) as WorkflowNode;
    const renewIds = (n: WorkflowNode) => {
      n.id = generateGuid();
      if ('nodes' in n && Array.isArray((n as any).nodes)) {
        (n as any).nodes.forEach((child: WorkflowNode) => renewIds(child));
      }
    };
    renewIds(cloned);
    return cloned;
  };

  const pushUndoSnapshot = (prevScript: EditorFile) => {
    setUndoStack(prev => {
      const next = [...prev, JSON.parse(JSON.stringify(prevScript))];
      if (next.length > 50) next.shift();
      return next;
    });
    setRedoStack([]);
  };

  const undo = () => {
    if (!currentProject || undoStack.length === 0) return;
    const prevScript = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const activeScr = getActiveScript() || currentProject.script;
    const currentSnapshot = JSON.parse(JSON.stringify(activeScr));

    setRedoStack(prev => [...prev, currentSnapshot]);
    setUndoStack(newUndoStack);
    applyScriptUpdate(prevScript);
  };

  const redo = () => {
    if (!currentProject || redoStack.length === 0) return;
    const nextScript = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const activeScr = getActiveScript() || currentProject.script;
    const currentSnapshot = JSON.parse(JSON.stringify(activeScr));

    setUndoStack(prev => [...prev, currentSnapshot]);
    setRedoStack(newRedoStack);
    applyScriptUpdate(nextScript);
  };

  const updateNode = (id: string, updates: Partial<any>) => {
    if (!currentProject) return;
    const script = getActiveScript() || currentProject.script;
    const now = Date.now();
    if (lastUpdateNodeIdRef.current !== id || now - lastUpdateTimeRef.current > 800) {
      pushUndoSnapshot(script);
      lastUpdateNodeIdRef.current = id;
    }
    lastUpdateTimeRef.current = now;

    const newScript = JSON.parse(JSON.stringify(script)) as EditorFile;
    const roots: ('before_init' | 'main_logic' | 'after_quit')[] = ['before_init', 'main_logic', 'after_quit'];

    for (const bk of roots) {
      const r = newScript[bk];
      if (!r) continue;
      if (r.id === id) {
        newScript[bk] = { ...r, ...updates };
        applyScriptUpdate(newScript);
        return;
      }
      if (updateNodeRecursive(r.nodes, id, updates)) {
        applyScriptUpdate(newScript);
        return;
      }
    }
  };

  const toggleBlockExpand = (blockId: string) => {
    if (!currentProject) return;
    const script = getActiveScript() || currentProject.script;
    const newScript = JSON.parse(JSON.stringify(script)) as EditorFile;
    const roots: ('before_init' | 'main_logic' | 'after_quit')[] = ['before_init', 'main_logic', 'after_quit'];

    for (const bk of roots) {
      const r = newScript[bk];
      if (!r) continue;
      if (r.id === blockId) {
        r.expanded = !r.expanded;
        applyScriptUpdate(newScript);
        return;
      }
      const findAndToggle = (nodes: WorkflowNode[]): boolean => {
        for (const n of nodes) {
          if (n.id === blockId && 'nodes' in n) {
            (n as any).expanded = !(n as any).expanded;
            return true;
          }
          if ('nodes' in n && Array.isArray((n as any).nodes)) {
            if (findAndToggle((n as any).nodes)) return true;
          }
        }
        return false;
      };
      if (findAndToggle(r.nodes)) {
        applyScriptUpdate(newScript);
        return;
      }
    }
  };

  // MAIN INSERTION: Double click / drop adds to bottom of selected block
  const insertActionOrBlock = (
    actionDef: ActionDefinition,
    explicitTargetId?: string | null,
    position: 'before' | 'after' | 'inside' = 'after'
  ) => {
    if (!currentProject) return;
    const script = getActiveScript() || currentProject.script;
    pushUndoSnapshot(script);

    const newScript = JSON.parse(JSON.stringify(script)) as EditorFile;
    const roots = [newScript.before_init, newScript.main_logic, newScript.after_quit].filter(Boolean);

    // Determine target ID
    const targetId = explicitTargetId || selectedNodeId;

    // Create the node
    let newNode: WorkflowNode;

    // Check if it's a Block type
    if (actionDef.category === 'Block' || (actionDef.type >= 101 && actionDef.type <= 106)) {
      const baseBlock = {
        nodes: [],
        expanded: true,
        continue_on_error: false,
        id: generateGuid(),
        display_text: actionDef.name,
        raw_input: null,
        comment: null,
      };

      if (actionDef.name === 'For' || actionDef.type === 102) {
        newNode = {
          ...baseBlock,
          $type: 'GPMAutomateEditor.Models.ForBlockNode, GPMAutomateEditor.Models',
          start: '0',
          end: '10',
          step: '1',
        } as ForBlockNode;
      } else if (actionDef.name === 'While' || actionDef.type === 103) {
        newNode = {
          ...baseBlock,
          $type: 'GPMAutomateEditor.Models.WhileBlockNode, GPMAutomateEditor.Models',
          condition: 'hasElement(//div)',
        } as WhileBlockNode;
      } else if (actionDef.name.toLowerCase().includes('else if') || actionDef.type === 105) {
        newNode = {
          ...baseBlock,
          $type: 'GPMAutomateEditor.Models.IfBlockNode, GPMAutomateEditor.Models',
          condition: '$x = 2',
          display_text: 'Else if',
        } as IfBlockNode;
      } else if (actionDef.name.toLowerCase() === 'else' || actionDef.type === 106) {
        newNode = {
          ...baseBlock,
          $type: 'GPMAutomateEditor.Models.NormalBlockNode, GPMAutomateEditor.Models',
          display_text: 'Else',
        } as NormalBlockNode;
      } else if (actionDef.name.startsWith('If') || actionDef.type === 104) {
        newNode = {
          ...baseBlock,
          $type: 'GPMAutomateEditor.Models.IfBlockNode, GPMAutomateEditor.Models',
          condition: '$x = 1',
        } as IfBlockNode;
      } else {
        newNode = {
          ...baseBlock,
          $type: 'GPMAutomateEditor.Models.NormalBlockNode, GPMAutomateEditor.Models',
        } as NormalBlockNode;
      }
    } else {
      // It's a standard ActionNode
      newNode = {
        $type: 'GPMAutomateEditor.Models.ActionNode, GPMAutomateEditor.Models',
        type: actionDef.type,
        element_xpath: actionDef.hasXPath ? '' : null,
        output_variable_name: actionDef.hasOutVar ? (actionDef.defaultOutVar || '') : null,
        delay: actionDef.defaultDelay !== undefined ? actionDef.defaultDelay : '0,0',
        continue_on_error: false,
        id: generateGuid(),
        display_text: actionDef.name,
        raw_input: actionDef.defaultRawInput ? serializeRawInput(actionDef.defaultRawInput) : '[]',
        comment: null,
      };
    }

    let inserted = false;

    if (targetId) {
      // 1. If target is one of the 3 root workflow blocks
      const matchedRoot = roots.find(r => r.id === targetId);
      if (matchedRoot) {
        if (position === 'before') {
          matchedRoot.nodes.unshift(newNode);
        } else {
          matchedRoot.nodes.push(newNode);
        }
        matchedRoot.expanded = true;
        inserted = true;
      } else {
        // 2. Search inside child trees
        const insertNearTarget = (arr: WorkflowNode[]): boolean => {
          const idx = arr.findIndex(n => n.id === targetId);
          if (idx !== -1) {
            const targetNode = arr[idx];
            if ('nodes' in targetNode && Array.isArray((targetNode as any).nodes) && position === 'inside') {
              (targetNode as any).nodes.push(newNode);
              (targetNode as any).expanded = true;
            } else if (position === 'before') {
              arr.splice(idx, 0, newNode);
            } else {
              // position === 'after'
              arr.splice(idx + 1, 0, newNode);
            }
            return true;
          }
          for (const item of arr) {
            if ('nodes' in item && Array.isArray((item as any).nodes)) {
              if (insertNearTarget((item as any).nodes)) return true;
            }
          }
          return false;
        };

        for (const r of roots) {
          if (insertNearTarget(r.nodes)) {
            inserted = true;
            break;
          }
        }
      }
    }

    // Default fallback if no target or target not found
    if (!inserted) {
      const targetBk = newScript[selectedBlockKey] ? selectedBlockKey : 'main_logic';
      newScript[targetBk].nodes.push(newNode);
      newScript[targetBk].expanded = true;
    }

    applyScriptUpdate(newScript);
    setSelectedNodeId(newNode.id);
    setSelectedNodeIds([newNode.id]);
  };

  const deleteSelectedNode = () => {
    if (!currentProject) return;
    const script = getActiveScript() || currentProject.script;
    const roots = [
      script.before_init?.id,
      script.main_logic?.id,
      script.after_quit?.id,
    ].filter(Boolean);
    const targetIds = (selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []))
      .filter(id => !roots.includes(id));

    if (targetIds.length === 0) return;

    pushUndoSnapshot(script);
    const newScript = JSON.parse(JSON.stringify(script)) as EditorFile;
    const rootBlocks = [newScript.before_init, newScript.main_logic, newScript.after_quit].filter(Boolean);
    const targetSet = new Set(targetIds);

    const deleteRecursive = (arr: WorkflowNode[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (targetSet.has(arr[i].id)) {
          arr.splice(i, 1);
        } else if ('nodes' in arr[i] && Array.isArray((arr[i] as any).nodes)) {
          deleteRecursive((arr[i] as any).nodes);
        }
      }
    };

    for (const r of rootBlocks) {
      deleteRecursive(r.nodes);
    }

    applyScriptUpdate(newScript);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  };

  // Helper to filter out any node that is already a descendant of another selected node
  const filterOutDescendants = (nodes: WorkflowNode[]): WorkflowNode[] => {
    const descendantIds = new Set<string>();
    const markDescendants = (n: any) => {
      if (n && Array.isArray(n.nodes)) {
        for (const ch of n.nodes) {
          if (ch && ch.id) descendantIds.add(String(ch.id));
          markDescendants(ch);
        }
      }
    };
    nodes.forEach(markDescendants);
    return nodes.filter(n => !descendantIds.has(String(n.id)));
  };

  const copySelectedNode = async () => {
    if (!currentProject) return;
    const script = getActiveScript() || currentProject.script;
    const roots = [
      script.before_init?.id,
      script.main_logic?.id,
      script.after_quit?.id,
    ].filter(Boolean);

    const targetIds = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
    const flat = getAllFlatNodes(currentProject);
    let nodesToCopy = flat.filter(n => targetIds.includes(n.id) && !roots.includes(n.id));

    // If a root block was selected, copy all its child nodes
    if (nodesToCopy.length === 0 && targetIds.length > 0) {
      const selectedRoot = [script.before_init, script.main_logic, script.after_quit].filter(Boolean).find(r => targetIds.includes(r.id));
      if (selectedRoot && selectedRoot.nodes.length > 0) {
        nodesToCopy = [...selectedRoot.nodes];
      }
    }

    // CRITICAL: Filter out any selected node that is already inside a selected block!
    nodesToCopy = filterOutDescendants(nodesToCopy);

    if (nodesToCopy.length === 0) return;

    // Clean JSON with 2 spaces indent
    const jsonOutput = nodesToJsonString(nodesToCopy, true);

    // Save to localStorage & sessionStorage so it is shared across all windows and projects!
    localStorage.setItem('gpm_clipboard_nodes', JSON.stringify(nodesToCopy));
    localStorage.setItem('gpm_clipboard_node', JSON.stringify(nodesToCopy[0]));
    sessionStorage.setItem('gpm_clipboard_nodes', JSON.stringify(nodesToCopy));
    sessionStorage.setItem('gpm_clipboard_node', JSON.stringify(nodesToCopy[0]));

    // 1. Native Electron system clipboard (guaranteed to work across OS, windows & external apps)
    if ((window as any).electronAPI?.fileAction) {
      try {
        await (window as any).electronAPI.fileAction({ action: 'setClipboard', payload: { text: jsonOutput } });
      } catch (_) {}
    }

    // 2. Web clipboard API
    try {
      await navigator.clipboard.writeText(jsonOutput);
    } catch (_) {}

    showToast('Copy JSON', `Đã sao chép ${nodesToCopy.length} node vào clipboard!`);
  };

  const cutSelectedNode = () => {
    copySelectedNode();
    deleteSelectedNode();
  };

  const pasteCopiedNode = async (customJsonText?: string) => {
    if (!currentProject) return;

    let sourceNodes: WorkflowNode[] = [];

    // 1. Try reading from customJsonText, native Electron clipboard, or navigator.clipboard
    let clipboardText = (customJsonText || '').trim();
    if (!clipboardText && (window as any).electronAPI?.fileAction) {
      try {
        const res = await (window as any).electronAPI.fileAction({ action: 'getClipboard' });
        if (res?.success && typeof res.text === 'string' && res.text.trim()) {
          clipboardText = res.text.trim();
        }
      } catch (_) {}
    }
    if (!clipboardText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) clipboardText = text.trim();
      } catch (_) {}
    }

    if (clipboardText) {
      try {
        const parsed = normalizeWorkflowNodes(clipboardText);
        if (parsed.length > 0) {
          sourceNodes = parsed;
        }
      } catch (_) {}
    }

    // 2. Fallback to localStorage or sessionStorage if clipboard text was empty or not workflow JSON
    if (sourceNodes.length === 0) {
      const rawList = localStorage.getItem('gpm_clipboard_nodes') || sessionStorage.getItem('gpm_clipboard_nodes');
      const rawSingle = localStorage.getItem('gpm_clipboard_node') || sessionStorage.getItem('gpm_clipboard_node');

      if (rawList) {
        try {
          const parsed = JSON.parse(rawList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            sourceNodes = normalizeWorkflowNodes(parsed);
          }
        } catch (_) {}
      }
      if (sourceNodes.length === 0 && rawSingle) {
        try {
          const parsed = JSON.parse(rawSingle);
          if (parsed && typeof parsed === 'object') {
            sourceNodes = normalizeWorkflowNodes([parsed]);
          }
        } catch (_) {}
      }
    }

    if (sourceNodes.length === 0) return;

    const newNodes = sourceNodes.map(n => cloneNodeWithNewIds(n));
    const newIds = newNodes.map(n => n.id);

    const script = getActiveScript() || currentProject.script;
    const newScript = JSON.parse(JSON.stringify(script)) as EditorFile;
    pushUndoSnapshot(script);

    const rootBlocks = [newScript.before_init, newScript.main_logic, newScript.after_quit].filter(Boolean);
    let inserted = false;

    // Anchor at the last selected node or single selected node
    const anchorId = selectedNodeIds.length > 0 ? selectedNodeIds[selectedNodeIds.length - 1] : selectedNodeId;

    if (anchorId) {
      // 1. If anchor is a root block
      const matchedRoot = rootBlocks.find(r => r.id === anchorId);
      if (matchedRoot) {
        matchedRoot.nodes.push(...newNodes);
        matchedRoot.expanded = true;
        inserted = true;
      } else {
        // 2. Check if anchor is an empty block node -> if so, insert inside it!
        const findAndInsertInEmptyBlock = (arr: WorkflowNode[]): boolean => {
          for (const item of arr) {
            if (item.id === anchorId && 'nodes' in item && Array.isArray((item as any).nodes)) {
              if ((item as any).nodes.length === 0) {
                (item as any).nodes.push(...newNodes);
                (item as any).expanded = true;
                return true;
              }
            }
            if ('nodes' in item && Array.isArray((item as any).nodes)) {
              if (findAndInsertInEmptyBlock((item as any).nodes)) return true;
            }
          }
          return false;
        };

        for (const root of rootBlocks) {
          if (findAndInsertInEmptyBlock(root.nodes)) {
            inserted = true;
            break;
          }
        }

        // 3. If not an empty block, insert immediately after the anchor child
        if (!inserted) {
          const insertAfterChild = (arr: WorkflowNode[]): boolean => {
            const idx = arr.findIndex(n => n.id === anchorId);
            if (idx !== -1) {
              arr.splice(idx + 1, 0, ...newNodes);
              return true;
            }
            for (const ch of arr) {
              if ('nodes' in ch && Array.isArray((ch as any).nodes)) {
                if (insertAfterChild((ch as any).nodes)) return true;
              }
            }
            return false;
          };

          for (const root of rootBlocks) {
            if (insertAfterChild(root.nodes)) {
              inserted = true;
              break;
            }
          }
        }
      }
    }

    if (!inserted) {
      const targetBk = newScript[selectedBlockKey] ? selectedBlockKey : 'main_logic';
      newScript[targetBk].nodes.push(...newNodes);
      newScript[targetBk].expanded = true;
    }

    applyScriptUpdate(newScript);
    setSelectedNodeIds(newIds);
    setSelectedNodeId(newIds[newIds.length - 1]);
    showToast('Paste JSON', `Đã dán ${newNodes.length} node vào workflow!`);
  };

  const insertNodesFromJson = (
    jsonStr: string,
    targetBlock: 'before_init' | 'main_logic' | 'after_quit' = selectedBlockKey || 'main_logic'
  ): { success: boolean; count: number; error?: string } => {
    if (!currentProject) return { success: false, count: 0, error: 'Chưa mở project' };
    try {
      const parsed = normalizeWorkflowNodes(jsonStr, true);
      if (parsed.length === 0) {
        return { success: false, count: 0, error: 'Không nhận diện được node hợp lệ trong chuỗi JSON' };
      }

      const newNodes = parsed.map(n => cloneNodeWithNewIds(n));
      const newIds = newNodes.map(n => n.id);

      const script = getActiveScript() || currentProject.script;
      const newScript = JSON.parse(JSON.stringify(script)) as EditorFile;
      pushUndoSnapshot(script);

      const targetBk = newScript[targetBlock] ? targetBlock : 'main_logic';
      newScript[targetBk].nodes.push(...newNodes);
      newScript[targetBk].expanded = true;

      applyScriptUpdate(newScript);
      setSelectedNodeIds(newIds);
      setSelectedNodeId(newIds[newIds.length - 1]);
      return { success: true, count: newNodes.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Lỗi xử lý JSON' };
    }
  };

  const duplicateSelectedNode = () => {
    if (!currentProject) return;
    const script = getActiveScript() || currentProject.script;
    const roots = [
      script.before_init?.id,
      script.main_logic?.id,
      script.after_quit?.id,
    ].filter(Boolean);
    const targetIds = (selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []))
      .filter(id => !roots.includes(id));

    if (targetIds.length === 0) return;

    pushUndoSnapshot(script);
    const newScript = JSON.parse(JSON.stringify(script)) as EditorFile;
    const flat = getAllFlatNodes(currentProject);
    let nodesToDuplicate = flat.filter(n => targetIds.includes(n.id) && !roots.includes(n.id));
    nodesToDuplicate = filterOutDescendants(nodesToDuplicate);
    if (nodesToDuplicate.length === 0) return;

    const clonedNodes = nodesToDuplicate.map(n => cloneNodeWithNewIds(n));
    const newIds = clonedNodes.map(n => n.id);

    // Insert after the last selected node
    const lastTargetId = targetIds[targetIds.length - 1];
    const rootBlocks = [newScript.before_init, newScript.main_logic, newScript.after_quit].filter(Boolean);

    let inserted = false;
    const insertAfterChild = (arr: WorkflowNode[]): boolean => {
      const idx = arr.findIndex(n => n.id === lastTargetId);
      if (idx !== -1) {
        arr.splice(idx + 1, 0, ...clonedNodes);
        return true;
      }
      for (const ch of arr) {
        if ('nodes' in ch && Array.isArray((ch as any).nodes)) {
          if (insertAfterChild((ch as any).nodes)) return true;
        }
      }
      return false;
    };

    for (const root of rootBlocks) {
      if (insertAfterChild(root.nodes)) {
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      const targetBk = newScript[selectedBlockKey] ? selectedBlockKey : 'main_logic';
      newScript[targetBk].nodes.push(...clonedNodes);
    }

    applyScriptUpdate(newScript);
    setSelectedNodeIds(newIds);
    setSelectedNodeId(newIds[newIds.length - 1]);
  };

  const clearWorkflow = () => {
    if (!currentProject) return;
    if (confirm('Are you sure you want to clear all nodes in the current workflow?')) {
      const script = getActiveScript() || currentProject.script;
      pushUndoSnapshot(script);
      const newScript = JSON.parse(JSON.stringify(script)) as EditorFile;
      const targetBk = newScript[selectedBlockKey] ? selectedBlockKey : 'main_logic';
      newScript[targetBk].nodes = [];
      applyScriptUpdate(newScript);
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
    }
  };

  const moveNode = (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside' | number = 'after'
  ) => {
    if (!currentProject || draggedId === targetId) return;
    const script = getActiveScript() || currentProject.script;
    pushUndoSnapshot(script);
    const newScript = JSON.parse(JSON.stringify(script)) as EditorFile;
    const roots = [newScript.before_init, newScript.main_logic, newScript.after_quit].filter(Boolean);

    // 1. Remove dragged node from the tree
    let extracted: WorkflowNode | null = null;
    const removeRecursive = (arr: WorkflowNode[]): boolean => {
      const idx = arr.findIndex(n => n.id === draggedId);
      if (idx !== -1) {
        extracted = arr.splice(idx, 1)[0];
        return true;
      }
      for (const item of arr) {
        if ('nodes' in item && Array.isArray((item as any).nodes)) {
          if (removeRecursive((item as any).nodes)) return true;
        }
      }
      return false;
    };

    for (const r of roots) {
      if (removeRecursive(r.nodes)) break;
    }

    if (!extracted) return;

    // Guard: Prevent dragging a parent block into its own child/descendant
    const isDescendant = (parent: WorkflowNode, checkId: string): boolean => {
      if ('nodes' in parent && Array.isArray((parent as any).nodes)) {
        for (const ch of (parent as any).nodes) {
          if (ch.id === checkId) return true;
          if (isDescendant(ch, checkId)) return true;
        }
      }
      return false;
    };
    if (isDescendant(extracted, targetId)) {
      return;
    }

    const itemToInsert: WorkflowNode = extracted;

    // 2. Insert extracted node relative to targetId
    let inserted = false;

    // Check if target is one of the 3 root workflow blocks
    const matchedRoot = roots.find(r => r.id === targetId);
    if (matchedRoot) {
      if (position === 'before' || position === 0) {
        matchedRoot.nodes.unshift(itemToInsert);
      } else if (typeof position === 'number') {
        matchedRoot.nodes.splice(position, 0, itemToInsert);
      } else {
        matchedRoot.nodes.push(itemToInsert);
      }
      matchedRoot.expanded = true;
      inserted = true;
    } else {
      // Find targetId in child trees
      const insertNearTarget = (arr: WorkflowNode[]): boolean => {
        const idx = arr.findIndex(n => n.id === targetId);
        if (idx !== -1) {
          const targetNode = arr[idx];
          if (
            'nodes' in targetNode &&
            Array.isArray((targetNode as any).nodes) &&
            (position === 'inside' || typeof position === 'number')
          ) {
            if (typeof position === 'number') {
              (targetNode as any).nodes.splice(position, 0, itemToInsert);
            } else {
              (targetNode as any).nodes.push(itemToInsert);
            }
            (targetNode as any).expanded = true;
          } else if (position === 'before') {
            arr.splice(idx, 0, itemToInsert);
          } else {
            // 'after'
            arr.splice(idx + 1, 0, itemToInsert);
          }
          return true;
        }
        for (const item of arr) {
          if ('nodes' in item && Array.isArray((item as any).nodes)) {
            if (insertNearTarget((item as any).nodes)) return true;
          }
        }
        return false;
      };

      for (const r of roots) {
        if (insertNearTarget(r.nodes)) {
          inserted = true;
          break;
        }
      }
    }

    if (inserted) {
      applyScriptUpdate(newScript);
      setSelectedNodeId(draggedId);
      setSelectedNodeIds([draggedId]);
    }
  };

  // Global keyboard listener for all shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      // Ctrl+S or Cmd+S to Save workflow (always active, even if in input)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveProject();
        return;
      }

      // Ctrl+Shift+N: Open New Window
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        if ((window as any).electronAPI?.newWindow) {
          (window as any).electronAPI.newWindow();
        }
        return;
      }

      // If user is typing in an input/textarea, do not intercept native editing shortcuts!
      if (isInputFocused) {
        return;
      }

      // Ctrl+A: Select all workflow nodes
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        selectAllNodes();
        return;
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+Shift+C: Open JSON Export Modal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setJsonModalMode('export');
        setShowJsonModal(true);
        return;
      }

      // Ctrl+Shift+V: Open JSON Import Modal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setJsonModalMode('import');
        setShowJsonModal(true);
        return;
      }

      // Ctrl+C: Copy selected node(s)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        copySelectedNode();
        return;
      }

      // Ctrl+V: Paste copied node(s)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        pasteCopiedNode();
        return;
      }

      // Ctrl+X: Cut selected node(s)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        cutSelectedNode();
        return;
      }

      // Ctrl+D: Duplicate selected node(s)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateSelectedNode();
        return;
      }

      // Delete or Backspace: Delete selected node(s)
      if (e.key === 'Delete' || e.key === 'Del' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedNode();
        return;
      }

      // Ctrl+F: Open search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedNodeIds, currentProject, undoStack, redoStack, selectedBlockKey]);

  const customVariables = extractProjectOutputVariables(currentProject);
  const allVariables = Array.from(new Set([...SYSTEM_VARIABLES, ...customVariables]));

  return (
    <ProjectContext.Provider
      value={{
        screen,
        setScreen,
        theme,
        themePreference,
        setTheme,
        toggleTheme,
        accentColor,
        setAccentColor,
        currentProject,
        recentProjects,
        activeWorkflowTab,
        setActiveWorkflowTab,
        activeScript,
        createSubWorkflow,
        deleteSubWorkflow,
        importSubWorkflow,
        selectedNodeId,
        selectedNodeIds,
        selectedBlockKey,
        showShortcuts,
        setShowShortcuts,
        showSaveToast,
        setShowSaveToast,
        toastInfo,
        showToast,
        showTestModal,
        setShowTestModal,
        showRuntimeModal,
        setShowRuntimeModal,
        showSettingsModal,
        setShowSettingsModal,
        showUpdateModal,
        setShowUpdateModal,
        showJsonModal,
        setShowJsonModal,
        jsonModalMode,
        setJsonModalMode,
        insertNodesFromJson,
        updateInfo,
        isCheckingUpdate,
        checkAppUpdate,
        allVariables,
        customVariables,
        createNewProject,
        openProjectByPath,
        removeRecentProject,
        clearRecentProjects,
        closeProject,
        saveProject,
        updateRuntimeConfig,
        selectNode,
        selectAllNodes,
        updateNode,
        insertActionOrBlock,
        deleteSelectedNode,
        getSelectedNode,
        toggleBlockExpand,
        moveNode,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        undo,
        redo,
        copySelectedNode,
        cutSelectedNode,
        pasteCopiedNode,
        duplicateSelectedNode,
        clearWorkflow,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};
