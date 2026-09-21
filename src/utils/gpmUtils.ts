import { EditorFile, ProjectInfo, ProjectData, NormalBlockNode, ActionNode } from '../types/gscript';

export function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createDefaultNormalBlock(name: string): NormalBlockNode {
  return {
    $type: 'GPMAutomateEditor.Models.NormalBlockNode, GPMAutomateEditor.Models',
    nodes: [],
    expanded: true,
    continue_on_error: false,
    id: generateGuid(),
    display_text: name,
    raw_input: null,
    comment: null,
  };
}

export function createDefaultScript(): EditorFile {
  return {
    $type: 'GPMAutomateEditor.Models.Editor, GPMAutomateEditor.Models',
    before_init: createDefaultNormalBlock('Before browser opened'),
    main_logic: createDefaultNormalBlock('Main logic'),
    after_quit: createDefaultNormalBlock('After browser closed'),
    name: 'Main',
  };
}

export function createDefaultProject(name: string = 'Untitled', folderPath: string = ''): ProjectData {
  const info: ProjectInfo = {
    id: generateGuid(),
    type: 'Browser',
    name: name,
    description: null,
    version: '3.0.8',
    password: null,
    author_info: 'SV Browser - svbrowser.com',
    logo: null,
    use_license_system: false,
    created_at: new Date().toISOString(),
  };

  return {
    folderPath,
    info,
    script: createDefaultScript(),
  };
}

export function serializeRawInput(pairs: Array<{ Key: string; Value: string }>): string {
  return JSON.stringify(pairs);
}

export function parseRawInput(raw: string | null): Array<{ Key: string; Value: string }> {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
