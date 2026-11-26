import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { ipcMain, WebContents } from 'electron';

export interface RecordedEvent { kind: string; xpath?: string; text?: string; key?: string; url?: string; value?: string; direction?: number }
export function recordedNode(event: RecordedEvent): any | null {
  const node: any = { $type: 'SVBAutomateEditor.Models.ActionNode, SVBAutomateEditor.Models', id: randomUUID(), element_xpath: event.xpath || null, output_variable_name: null, delay: '300,500', continue_on_error: false, comment: 'Recorded action' };
  let pairs: Array<{ Key: string; Value: string }> = [];
  if (event.kind === 'click' && event.xpath) { node.type = 48; node.display_text = 'Mouse click'; pairs = [{ Key: 'CLICK_TYPE', Value: 'Click by Xpath' }, { Key: 'XPATH', Value: event.xpath }, { Key: 'POS', Value: '' }]; }
  else if (event.kind === 'text' && event.xpath && typeof event.text === 'string') { node.type = 54; node.display_text = 'Key press › Text'; pairs = [{ Key: 'XPATH', Value: event.xpath }, { Key: 'TYPE', Value: 'Text' }, { Key: 'KEY', Value: event.text }, { Key: 'DELAY_PRESS', Value: '-1' }]; }
  else if (event.kind === 'key' && event.key) { node.type = 54; node.display_text = `Key press › ${event.key}`; pairs = [{ Key: 'XPATH', Value: event.xpath || '' }, { Key: 'TYPE', Value: event.key.includes('+') ? 'Combo key' : 'Single key' }, { Key: 'KEY', Value: event.key }, { Key: 'DELAY_PRESS', Value: '-1' }]; }
  else if (event.kind === 'select' && event.xpath) { node.type = 111; node.display_text = 'Select dropdown'; pairs = [{ Key: 'SELECT_TEXT', Value: event.value || '' }]; }
  else if (event.kind === 'url' && /^https?:\/\//.test(event.url || '')) { node.type = 39; node.display_text = 'Go to URL'; pairs = [{ Key: 'URL', Value: event.url! }, { Key: 'TIME_OUT', Value: '60' }]; }
  else if (event.kind === 'scroll') { node.type = 53; node.display_text = 'Mouse scroll'; pairs = [{ Key: 'SCROLL_NUM', Value: event.direction === -1 ? '-1' : '1' }]; }
  else return null;
  node.raw_input = JSON.stringify(pairs);
  return node;
}

// Serialized after TypeScript compilation: all helpers must remain inside here.
export function installRecorder(binding: string) {
  if (window !== window.top) return; // Frame XPaths need a separate Switch to frame action.
  const scope = window as any;
  const cleanupName = binding + '_cleanup';
  scope[cleanupName]?.();
  let pending: HTMLElement | null = null;
  let lastWheel = 0;
  const removers: Array<() => void> = [];
  const send = (event: RecordedEvent) => { try { scope[binding](JSON.stringify(event)); } catch {} };
  const quote = (text: string): string => !text.includes("'") ? `'${text}'` : !text.includes('"') ? `"${text}"` : `concat(${text.split("'").map(t => `'${t}'`).join(',"\'",')})`;
  const xpath = (el: Element): string => {
    for (const attr of ['id', 'data-testid', 'name', 'aria-label', 'placeholder']) {
      const value = el.getAttribute(attr);
      if (value && value.length < 150) {
        const candidate = `//${el.localName}[@${attr}=${quote(value)}]`;
        try { if (document.evaluate(candidate, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength === 1) return candidate; } catch {}
      }
    }
    const parts: string[] = [];
    let current: Element | null = el;
    while (current) {
      let index = 1, sibling = current.previousElementSibling;
      while (sibling) { if (sibling.localName === current.localName) index++; sibling = sibling.previousElementSibling; }
      parts.unshift(`${current.localName}[${index}]`); current = current.parentElement;
    }
    return '/' + parts.join('/');
  };
  const sensitive = (el: HTMLElement) => !!el.closest('input[type="password"],input[autocomplete="one-time-code"],input[autocomplete*="password"]');
  const flush = () => {
    if (pending && !sensitive(pending)) {
      send({ kind: 'text', xpath: xpath(pending), text: pending.isContentEditable ? pending.innerText : (pending as HTMLInputElement).value });
    }
    pending = null;
  };
  const on = (name: string, handler: (e: any) => void) => { document.addEventListener(name, handler, true); removers.push(() => document.removeEventListener(name, handler, true)); };
  on('pointerdown', (e: PointerEvent) => {
    if (!e.isTrusted || e.button !== 0 || !(e.target instanceof Element)) return;
    flush();
    const el = e.target.closest('button,a,input,textarea,select,[role="button"],[contenteditable="true"]') || e.target;
    if (el instanceof HTMLInputElement && el.type === 'file') return;
    send({ kind: 'click', xpath: xpath(el) });
  });
  on('input', (e: InputEvent) => {
    const el = e.target;
    if (!e.isTrusted || !(el instanceof HTMLElement) || sensitive(el)) return;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable)) return;
    if (el instanceof HTMLInputElement && !['text', 'email', 'search', 'tel', 'url', 'number', ''].includes(el.type)) return;
    if (pending && pending !== el) flush();
    pending = el;
  });
  on('change', (e: Event) => {
    if (!e.isTrusted) return;
    if (e.target instanceof HTMLSelectElement) { flush(); send({ kind: 'select', xpath: xpath(e.target), value: e.target.selectedOptions[0]?.text || '' }); }
  });
  on('keydown', (e: KeyboardEvent) => {
    if (!e.isTrusted || e.isComposing || e.repeat || !(e.target instanceof HTMLElement) || sensitive(e.target)) return;
    // Do not silently turn Shift+Enter/Ctrl+Enter into a plain Enter action.
    // Edited text (including shifted characters/paste) is still captured by input.
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const keys = ['Enter', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'F1', 'F2', 'F5', 'F11', 'F12'];
    if (!keys.includes(e.key)) return; // Text is recorded through input, including IME/paste/backspace edits.
    flush();
    send({ kind: 'key', key: e.key, xpath: xpath(e.target) });
  });
  on('focusout', flush);
  on('wheel', (e: WheelEvent) => { if (e.isTrusted && e.deltaY && Date.now() - lastWheel > 250) { flush(); lastWheel = Date.now(); send({ kind: 'scroll', direction: e.deltaY < 0 ? -1 : 1 }); } });
  const unload = () => flush();
  window.addEventListener('pagehide', unload, true);
  scope[cleanupName] = () => { flush(); removers.forEach(remove => remove()); window.removeEventListener('pagehide', unload, true); delete scope[cleanupName]; };
}

class RecorderSession {
  private socket: WebSocket;
  private nextId = 0;
  private waiting = new Map<number, { resolve: (data: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private binding = '__svb_record_' + randomUUID().replace(/-/g, '');
  private scriptId?: string;
  private stopping = false;
  nodes: any[] = [];
  constructor(url: string, private owner: WebContents) {
    this.socket = new WebSocket(url);
    this.socket.on('message', raw => {
      let data: any; try { data = JSON.parse(raw.toString()); } catch { return; }
      const pending = this.waiting.get(data.id);
      if (pending) { clearTimeout(pending.timer); this.waiting.delete(data.id); data.error ? pending.reject(Error(data.error.message)) : pending.resolve(data.result); }
      if (data.method === 'Runtime.bindingCalled' && data.params?.name === this.binding && this.nodes.length < 2000) {
        try {
          const payload = data.params.payload;
          if (payload.length > 65536) return;
          const node = recordedNode(JSON.parse(payload));
          if (node) { this.nodes.push(node); this.status(this.nodes.length >= 2000 ? 'Đã đạt giới hạn 2000 action, hãy bấm Dừng.' : undefined); }
        } catch {}
      }
    });
    this.socket.on('close', () => { this.rejectPending(); if (!this.stopping) this.status('Tab ghi thao tác đã đóng hoặc mất kết nối.', false); });
    this.socket.on('error', () => { if (!this.stopping) this.status('Không kết nối được trình duyệt.', false); });
  }
  private rejectPending() { for (const item of this.waiting.values()) { clearTimeout(item.timer); item.reject(Error('Recorder disconnected')); } this.waiting.clear(); }
  private status(error?: string, recording = true) { if (!this.owner.isDestroyed()) this.owner.send('recorder:status', { recording, count: this.nodes.length, error }); }
  private call(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.socket.readyState !== WebSocket.OPEN) return reject(Error('Recorder disconnected'));
      const id = ++this.nextId;
      const timer = setTimeout(() => { this.waiting.delete(id); reject(Error(`${method}: timeout`)); }, 4000);
      this.waiting.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async start(initialUrl: string) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { this.socket.terminate(); reject(Error('Recorder connection timeout')); }, 4000);
      this.socket.once('open', () => { clearTimeout(timer); resolve(); });
      this.socket.once('error', () => { clearTimeout(timer); reject(Error('Không kết nối được port Chromium')); });
    });
    await this.call('Runtime.enable'); await this.call('Page.enable');
    await this.call('Runtime.addBinding', { name: this.binding });
    const source = `(${installRecorder.toString()})(${JSON.stringify(this.binding)})`;
    this.scriptId = (await this.call('Page.addScriptToEvaluateOnNewDocument', { source })).identifier;
    const injected = await this.call('Runtime.evaluate', { expression: source });
    if (injected.exceptionDetails) throw Error('Không thể bật ghi thao tác trên tab này');
    const initial = recordedNode({ kind: 'url', url: initialUrl }); if (initial) this.nodes.unshift(initial);
    this.status();
  }
  async stop() {
    if (this.stopping) return this.nodes;
    this.stopping = true;
    if (this.socket.readyState === WebSocket.OPEN) {
      try { await this.call('Runtime.evaluate', { expression: `window[${JSON.stringify(this.binding + '_cleanup')}]?.()` }); } catch {}
      if (this.scriptId) await this.call('Page.removeScriptToEvaluateOnNewDocument', { identifier: this.scriptId }).catch(() => {});
      await this.call('Runtime.removeBinding', { name: this.binding }).catch(() => {});
    }
    this.socket.terminate(); this.rejectPending();
    return this.nodes;
  }
}

async function visiblePage(page: any, port: number): Promise<{ visible: boolean; focused: boolean }> {
  return new Promise(resolve => {
    const url = new URL(page.webSocketDebuggerUrl); url.hostname = '127.0.0.1'; url.port = String(port);
    if (!['ws:', 'wss:'].includes(url.protocol)) return resolve({ visible: false, focused: false });
    const ws = new WebSocket(url.toString());
    let settled = false;
    const done = (value: any) => { if (settled) return; settled = true; clearTimeout(timer); ws.terminate(); resolve(value || { visible: false, focused: false }); };
    const timer = setTimeout(() => done(null), 1500);
    ws.on('error', () => done(null));
    ws.on('open', () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: '({visible:document.visibilityState === "visible", focused:document.hasFocus()})', returnByValue: true } })));
    ws.on('message', raw => { try { const data = JSON.parse(raw.toString()); if (data.id === 1) done(data.result?.result?.value); } catch { done(null); } });
  });
}

export function registerActionRecorder() {
  const sessions = new Map<number, RecorderSession>();
  ipcMain.handle('recorder:start', async (event, options: { port: number }) => {
    const owner = event.sender;
    if (sessions.has(owner.id)) return { success: false, error: 'Recorder đang hoạt động' };
    const port = Number(options?.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { success: false, error: 'Port Chromium không hợp lệ' };
    let session: RecorderSession | undefined;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) });
      const targets = await response.json() as any;
      const pages = Array.isArray(targets) ? targets.filter((t: any) => t.type === 'page' && /^https?:\/\//.test(t.url) && t.webSocketDebuggerUrl) : [];
      if (!pages.length) throw Error('Không thấy tab web tại port này. Hãy mở trang cần ghi trước.');
      if (owner.isDestroyed()) throw Error('Cửa sổ Editor đã đóng');
      if (pages.length > 20) throw Error('Có hơn 20 tab web. Hãy đóng bớt tab trước khi ghi.');
      const visibility = await Promise.all(pages.map((page: any) => visiblePage(page, port)));
      const focused = visibility.findIndex(state => state.focused && state.visible);
      const visible = visibility.findIndex(state => state.visible);
      const page = pages[focused >= 0 ? focused : visible >= 0 ? visible : 0];
      const socketUrl = new URL(page.webSocketDebuggerUrl);
      // Use only the port explicitly selected by the user, regardless of advertised host.
      socketUrl.hostname = '127.0.0.1'; socketUrl.port = String(port);
      if (!['ws:', 'wss:'].includes(socketUrl.protocol)) throw Error('WebSocket URL không hợp lệ');
      session = new RecorderSession(socketUrl.toString(), owner);
      sessions.set(owner.id, session);
      await session.start(page.url);
      if (owner.isDestroyed()) throw Error('Cửa sổ Editor đã đóng');
      owner.once('destroyed', () => { const running = sessions.get(owner.id); sessions.delete(owner.id); void running?.stop(); });
      return { success: true, url: page.url, count: session.nodes.length };
    } catch (error: any) { sessions.delete(owner.id); await session?.stop(); return { success: false, error: error.message }; }
  });
  ipcMain.handle('recorder:stop', async event => {
    const session = sessions.get(event.sender.id);
    if (!session) return { success: true, nodes: [] };
    const nodes = await session.stop(); sessions.delete(event.sender.id);
    return { success: true, nodes };
  });
}
