export interface KeyValuePair {
  Key: string;
  Value: string;
}

export interface BaseNode {
  $type: string;
  id: string;
  display_text: string | null;
  comment: string | null;
  continue_on_error: boolean;
}

export interface ActionNode extends BaseNode {
  type: number;
  element_xpath: string | null;
  output_variable_name: string | null;
  delay: string;
  raw_input: string | null; // JSON encoded string like "[{\"Key\":\"...\",\"Value\":\"...\"}]"
}

export interface NormalBlockNode extends BaseNode {
  nodes: (ActionNode | BlockNode)[];
  expanded: boolean;
  raw_input: string | null;
}

export interface ForBlockNode extends BaseNode {
  start: string;
  end: string;
  step: string;
  nodes: (ActionNode | BlockNode)[];
  expanded: boolean;
  raw_input: string | null;
}

export interface IfBlockNode extends BaseNode {
  condition: string;
  nodes: (ActionNode | BlockNode)[];
  expanded: boolean;
  raw_input: string | null;
}

export interface ElseIfBlockNode extends BaseNode {
  condition: string;
  nodes: (ActionNode | BlockNode)[];
  expanded: boolean;
  raw_input: string | null;
}

export interface ElseBlockNode extends BaseNode {
  nodes: (ActionNode | BlockNode)[];
  expanded: boolean;
  raw_input: string | null;
}

export interface WhileBlockNode extends BaseNode {
  condition: string;
  nodes: (ActionNode | BlockNode)[];
  expanded: boolean;
  raw_input: string | null;
}

export type BlockNode = NormalBlockNode | ForBlockNode | IfBlockNode | ElseIfBlockNode | ElseBlockNode | WhileBlockNode;

export type WorkflowNode = ActionNode | BlockNode;

export interface EditorFile {
  $type: string;
  before_init: NormalBlockNode;
  main_logic: NormalBlockNode;
  after_quit: NormalBlockNode;
  name: string;
}

export interface ProjectInfo {
  id: string;
  type: "Browser" | "Phone";
  name: string;
  description: string | null;
  version: string;
  password: string | null;
  author_info: string;
  logo: string | null;
  use_license_system: boolean;
  created_at: string;
}

export interface ProjectRuntimeConfig {
  // Window & Screen
  windowSizeMode?: 'percent' | 'custom';
  autoTileWindows?: boolean;
  tilePreset?: string;
  percentWidth?: number;
  percentHeight?: number;
  windowWidth?: number;
  windowHeight?: number;
  windowScale?: number;
  screenTarget?: string;

  // Excel Input
  useInputExcel?: boolean;
  excelFilePath?: string;
  excelSheetId?: number;
  excelMapMode?: 'all' | 'one';
  excelMapColA?: boolean;
  excelWriteOk?: boolean;
  excelOkCol?: string;
  excelSkipIfHasText?: boolean;
  skipStatusKeywords?: string;

  // TXT Input
  useInputTxt?: boolean;
  txtFilePath?: string;
  txtMapMode?: 'all' | 'one';
  txtSkipKeywords?: string;
  txtWriteOk?: boolean;

  // Session Configuration
  sessionName?: string;
  numThreads?: number;
  threadDelay?: number;
  skipProxyCheck?: boolean;
  doNotCloseOnError?: boolean;
  closeBrowserOnDone?: boolean;
  performanceLimit?: boolean;
  hideWindowWhenDone?: boolean;
  useVirtualMouse?: boolean;
  restartOnError?: boolean;
  retryCount?: number;

  // Schedule
  useSchedule?: boolean;

  // Selected Profiles & Engine
  selectedProfileIds?: string[];
  selectedEngine?: string;
  selectedProvider?: string;
  profilesSortOrder?: string;
  profilesPerPage?: number;
  selectedGroup?: string;
  selectedTag?: string;
  autoCloneProfile?: boolean;
  autoGenProfilesMode?: boolean;
  autoGenCountMode?: 'input_data' | 'custom_count';
  autoGenCustomCount?: number;
  templateProfileUid?: string;
  proxyListText?: string;
  checkProxyBeforeCreate?: boolean;

  // Rotating / Dynamic Proxy API
  proxyMode?: 'static' | 'rotating';
  rotatingProxyApiUrl?: string;
  rotatingProxyApiUrlsText?: string;
  rotatingProxyThreadsPerProxy?: number;
  rotatingProxyAutoDivideThreads?: boolean;
  rotatingProxyJsonPath?: string;
  rotatingProxyRandomRegions?: string;
  rotatingProxyRandomParamName?: string;
  rotatingProxyBatchWait?: boolean;
  rotatingProxyReuseIfCooldown?: boolean;
}

export interface ProjectData {
  folderPath: string;
  packagePath?: string;
  isPackaged?: boolean;
  manifest?: any;
  info: ProjectInfo;
  script: EditorFile;
  subWorkflows?: Record<string, EditorFile>;
  runtimeConfig?: ProjectRuntimeConfig;
}

