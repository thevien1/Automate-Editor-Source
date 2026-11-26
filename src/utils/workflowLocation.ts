import { EditorFile, WorkflowNode } from '../types/gscript';
export type WorkflowBlockKey = 'before_init' | 'main_logic' | 'after_quit';
export interface WorkflowLocation {
  workflow: string;
  block: WorkflowBlockKey;
  line: number;
  nodeId: string;
  path: string[];
  parentIds: string[];
  node: WorkflowNode;
  internal?: boolean;
}
export const BLOCK_NAMES: Record<WorkflowBlockKey, string> = { before_init: 'Before browser opened', main_logic: 'Main logic', after_quit: 'After browser closed' };
// Match Canvas/NodeRow numbering, including roots and collapsed descendants.
export function indexWorkflow(script: EditorFile, workflow = 'main'): WorkflowLocation[] {
  const result: WorkflowLocation[] = [];
  const roots: WorkflowBlockKey[] = workflow === 'main' ? ['before_init', 'main_logic', 'after_quit'] : ['main_logic'];
  function walk(node: WorkflowNode, block: WorkflowBlockKey, parents: string[], labels: string[]) {
    const label = node.display_text || (node as any).condition || 'Action';
    result.push({ workflow, block, line: result.length + 1, nodeId: node.id, path: [...labels, label], parentIds: parents, node });
    if ('nodes' in node && Array.isArray(node.nodes)) for (const child of node.nodes) walk(child, block, [...parents, node.id], [...labels, label]);
  }
  for (const block of roots) if (script?.[block]) walk(script[block], block, [], []);
  return result;
}
export function formatWorkflowLocation(location: WorkflowLocation, detailed = true): string {
  const branch = location.workflow === 'main' ? 'Nhánh chính' : `Nhánh phụ: ${location.workflow}`;
  const nested = location.path.slice(1).join(' > ');
  const base = `${branch} | ${BLOCK_NAMES[location.block]} | ${location.internal ? 'Dòng nội bộ' : 'Dòng'} ${location.line}`;
  return detailed ? `${base}${nested ? ` | ${nested}` : ''} | ID ${location.nodeId}` : base;
}
