import { WorkflowNode, ActionNode, BaseNode, NormalBlockNode, IfBlockNode, ForBlockNode, WhileBlockNode } from '../types/gscript';
import { generateGuid, serializeRawInput } from './gpmUtils';

/**
 * Normalizes any raw JSON (single object, array, or partial object) into valid WorkflowNode array
 */
export function normalizeWorkflowNodes(raw: any): WorkflowNode[] {
  if (!raw) return [];

  let data = raw;
  if (typeof raw === 'string') {
    let cleanStr = raw.replace(/^\uFEFF/, '').trim();
    // If user pasted JS code like `const actionNodes = [ ... ];`, strip variable declaration
    if (cleanStr.startsWith('//') || cleanStr.includes('=')) {
      const eqIdx = cleanStr.indexOf('=');
      if (eqIdx !== -1) {
        const afterEq = cleanStr.substring(eqIdx + 1).trim();
        const semiIdx = afterEq.lastIndexOf(';');
        cleanStr = semiIdx !== -1 ? afterEq.substring(0, semiIdx).trim() : afterEq;
      }
    }

    try {
      data = JSON.parse(cleanStr);
    } catch {
      data = tryRepairJson(cleanStr);
      if (!data) return [];
    }
  }

function tryRepairJson(str: string): any {
  let s = str.trim();
  try { return JSON.parse(`[${s}]`); } catch {}

  if (!s.startsWith('{') && !s.startsWith('[')) {
    if (/^"?([a-zA-Z0-9_$]+)"?\s*:/.test(s)) {
      if (!s.startsWith('"')) s = `"${s}`;
      s = `{\n${s}`;
    }
  }

  try { return JSON.parse(s); } catch {}
  try { return JSON.parse(`[${s}]`); } catch {}

  let openBraces = 0, openBrackets = 0, inString = false, escaped = false;
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces = Math.max(0, openBraces - 1);
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
    }
  }
  let repaired = s;
  while (openBraces > 0) { repaired += '\n}'; openBraces--; }
  while (openBrackets > 0) { repaired += '\n]'; openBrackets--; }
  try { return JSON.parse(repaired); } catch {}
  try { return JSON.parse(`[${repaired}]`); } catch {}
  return null;
}

  // If user pasted a full script (EditorFile): extract nodes from blocks
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.main_logic || data.before_init || data.after_quit) {
      const nodes: WorkflowNode[] = [];
      if (data.before_init?.nodes && Array.isArray(data.before_init.nodes)) {
        nodes.push(...data.before_init.nodes);
      }
      if (data.main_logic?.nodes && Array.isArray(data.main_logic.nodes)) {
        nodes.push(...data.main_logic.nodes);
      }
      if (data.after_quit?.nodes && Array.isArray(data.after_quit.nodes)) {
        nodes.push(...data.after_quit.nodes);
      }
      return nodes.map((n) => normalizeSingleNode(n)).filter(Boolean) as WorkflowNode[];
    }
  }

  const list = Array.isArray(data) ? data : [data];

  // Detect and filter out any top-level nodes whose IDs are already contained inside a block
  // (Fixes the duplicate children bug when copying complex nested workflows)
  const descendantIds = new Set<string>();
  const collectChildIds = (n: any) => {
    if (n && Array.isArray(n.nodes)) {
      for (const ch of n.nodes) {
        if (ch && ch.id) descendantIds.add(String(ch.id));
        collectChildIds(ch);
      }
    }
  };
  list.forEach(collectChildIds);

  const filteredList = list.filter((item: any) => !item?.id || !descendantIds.has(String(item.id)));
  return filteredList.map((item) => normalizeSingleNode(item)).filter(Boolean) as WorkflowNode[];
}

/**
 * Filters out any nodes that are descendants of another node in the array
 */
export function filterOutDescendants(nodes: WorkflowNode[]): WorkflowNode[] {
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
  return nodes.filter((n) => !descendantIds.has(String(n.id)));
}

/**
 * Normalizes a single node object
 */
export function normalizeSingleNode(node: any): WorkflowNode | null {
  if (!node || typeof node !== 'object') return null;

  const id = node.id && typeof node.id === 'string' ? node.id : generateGuid();
  const comment = node.comment ?? null;
  const displayText = node.display_text ?? null;
  const continueOnError = Boolean(node.continue_on_error);

  // Normalize raw_input
  let rawInput: string | null = null;
  if (node.raw_input !== undefined && node.raw_input !== null) {
    if (typeof node.raw_input === 'string') {
      rawInput = node.raw_input;
    } else if (Array.isArray(node.raw_input)) {
      rawInput = JSON.stringify(node.raw_input);
    } else if (typeof node.raw_input === 'object') {
      // Convert { KEY: 'val' } or pairs
      const pairs = Object.entries(node.raw_input).map(([Key, Value]) => ({
        Key,
        Value: String(Value),
      }));
      rawInput = serializeRawInput(pairs);
    }
  }

  // Check if it's a block node
  const hasNodes = Array.isArray(node.nodes);
  const isIfBlock =
    node.$type?.includes('IfBlockNode') ||
    node.display_text?.toLowerCase().startsWith('if') ||
    node.condition !== undefined;
  const isForBlock =
    node.$type?.includes('ForBlockNode') ||
    node.display_text?.toLowerCase() === 'for';
  const isWhileBlock =
    node.$type?.includes('WhileBlockNode') ||
    node.display_text?.toLowerCase() === 'while';

  if (hasNodes || isIfBlock || isForBlock || isWhileBlock) {
    const childNodes: WorkflowNode[] = hasNodes
      ? (node.nodes.map((ch: any) => normalizeSingleNode(ch)).filter(Boolean) as WorkflowNode[])
      : [];

    if (isIfBlock) {
      const ifNode: IfBlockNode = {
        $type: node.$type || 'GPMAutomateEditor.Models.IfBlockNode, GPMAutomateEditor.Models',
        id,
        comment,
        display_text: displayText || 'If',
        continue_on_error: continueOnError,
        expanded: node.expanded ?? true,
        nodes: childNodes,
        condition: node.condition || '',
        raw_input: rawInput,
      };
      return ifNode;
    }

    if (isForBlock) {
      const forNode: ForBlockNode = {
        $type: node.$type || 'GPMAutomateEditor.Models.ForBlockNode, GPMAutomateEditor.Models',
        id,
        comment,
        display_text: displayText || 'For',
        continue_on_error: continueOnError,
        expanded: node.expanded ?? true,
        nodes: childNodes,
        start: String(node.start ?? node.from_number ?? '0'),
        end: String(node.end ?? node.to_number ?? '10'),
        step: String(node.step ?? '1'),
        raw_input: rawInput,
      };
      return forNode;
    }

    if (isWhileBlock) {
      const whileNode: WhileBlockNode = {
        $type: node.$type || 'GPMAutomateEditor.Models.WhileBlockNode, GPMAutomateEditor.Models',
        id,
        comment,
        display_text: displayText || 'While',
        continue_on_error: continueOnError,
        expanded: node.expanded ?? true,
        nodes: childNodes,
        condition: node.condition || '',
        raw_input: rawInput,
      };
      return whileNode;
    }

    // Default Normal Block
    const normalBlock: NormalBlockNode = {
      $type: node.$type || 'GPMAutomateEditor.Models.NormalBlockNode, GPMAutomateEditor.Models',
      id,
      comment,
      display_text: displayText || 'Normal block',
      continue_on_error: continueOnError,
      expanded: node.expanded ?? true,
      nodes: childNodes,
      raw_input: rawInput,
    };
    return normalBlock;
  }

  // Otherwise it's an ActionNode
  const actionNode: ActionNode = {
    $type: node.$type || 'GPMAutomateEditor.Models.ActionNode, GPMAutomateEditor.Models',
    id,
    type: typeof node.type === 'number' ? node.type : parseInt(node.type, 10) || 0,
    element_xpath: node.element_xpath ?? null,
    output_variable_name: node.output_variable_name ?? null,
    delay: typeof node.delay === 'string' ? node.delay : String(node.delay ?? ''),
    continue_on_error: continueOnError,
    display_text: displayText,
    raw_input: rawInput,
    comment,
  };

  return actionNode;
}

/**
 * Converts node(s) to a clean, formatted JSON string
 */
export function nodesToJsonString(nodes: WorkflowNode | WorkflowNode[], pretty: boolean = true): string {
  const content = Array.isArray(nodes) && nodes.length === 1 ? nodes[0] : nodes;
  return JSON.stringify(content, null, pretty ? 2 : undefined);
}

/**
 * Generates TypeScript / JavaScript code snippet for the node(s)
 */
export function nodesToJsCodeString(nodes: WorkflowNode | WorkflowNode[]): string {
  const list = Array.isArray(nodes) ? nodes : [nodes];
  if (list.length === 0) return '// No nodes selected';

  const snippets = list.map((n) => {
    if ('nodes' in n) {
      // Block
      const condField = (n as any).condition !== undefined ? `\n  condition: ${JSON.stringify((n as any).condition)},` : '';
      const forFields = (n as any).start !== undefined ? `\n  start: ${JSON.stringify((n as any).start)},\n  end: ${JSON.stringify((n as any).end)},\n  step: ${JSON.stringify((n as any).step)},` : '';
      return `{
  $type: ${JSON.stringify(n.$type)},
  id: generateGuid(),
  display_text: ${JSON.stringify(n.display_text)},${condField}${forFields}
  expanded: true,
  nodes: [
    // Child nodes here...
  ]
}`;
    }

    const a = n as ActionNode;
    return `{
  $type: ${JSON.stringify(a.$type || 'GPMAutomateEditor.Models.ActionNode, GPMAutomateEditor.Models')},
  type: ${a.type},
  element_xpath: ${JSON.stringify(a.element_xpath)},
  output_variable_name: ${JSON.stringify(a.output_variable_name)},
  delay: ${JSON.stringify(a.delay || '')},
  continue_on_error: ${a.continue_on_error},
  id: generateGuid(),
  display_text: ${JSON.stringify(a.display_text)},
  raw_input: ${a.raw_input ? JSON.stringify(a.raw_input) : 'null'},
  comment: ${JSON.stringify(a.comment)}
}`;
  });

  if (snippets.length === 1) {
    return `// Action Node Object (copy & paste into your code)
const actionNode = ${snippets[0]};
`;
  }

  return `// Action Nodes Array (copy & paste into your code)
const actionNodes = [
${snippets.map((s) => '  ' + s.split('\n').join('\n  ')).join(',\n')}
];
`;
}
