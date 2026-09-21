/**
 * GPM Automate - Virtual Mouse Script
 * Injected into Chrome page context via CDP Runtime.evaluate and Page.addScriptToEvaluateOnNewDocument.
 * Provides a visible, human-like virtual mouse cursor (red pointer) that moves
 * with natural Bezier curves and performs realistic DOM clicks without hijacking the OS cursor.
 * The virtual mouse stays visible until the Chrome window is closed.
 */

export const VIRTUAL_MOUSE_SCRIPT = `
(() => {
  if (window.__gpmVirtualMouse) {
    return window.__gpmVirtualMouse;
  }

  const ID = '__gpm_virtual_cursor';

  let savedX = null;
  let savedY = null;
  try {
    savedX = parseFloat(sessionStorage.getItem('__gpm_cursor_x') || '');
    savedY = parseFloat(sessionStorage.getItem('__gpm_cursor_y') || '');
  } catch(e) {}

  let curX = (!isNaN(savedX) && savedX > 0) ? savedX : Math.round(window.innerWidth / 2);
  let curY = (!isNaN(savedY) && savedY > 0) ? savedY : Math.round(window.innerHeight / 2);
  let cursorEl = null;

  function ensureCursor() {
    try {
      cursorEl = document.getElementById(ID);
      const parent = document.body || document.documentElement;
      if (!cursorEl && parent) {
        cursorEl = document.createElement('div');
        cursorEl.id = ID;
        cursorEl.style.cssText = 'position:fixed;top:0;left:0;width:24px;height:24px;pointer-events:none;z-index:2147483647;transform:translate(' + curX + 'px,' + curY + 'px);transition:transform 0.05s ease-out;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.45));';

        // Red pointer cursor built via DOM API to comply with strict CSP & TrustedHTML
        try {
          const svgNS = 'http://www.w3.org/2000/svg';
          const svg = document.createElementNS(svgNS, 'svg');
          svg.setAttribute('width', '24');
          svg.setAttribute('height', '24');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('fill', 'none');

          const path = document.createElementNS(svgNS, 'path');
          path.setAttribute('d', 'M4 2L20 12L12.5 13.5L9.5 20L4 2Z');
          path.setAttribute('fill', '#ef4444');
          path.setAttribute('stroke', '#ffffff');
          path.setAttribute('stroke-width', '1.8');
          path.setAttribute('stroke-linejoin', 'round');

          svg.appendChild(path);
          cursorEl.appendChild(svg);
        } catch (svgErr) {
          cursorEl.style.width = '16px';
          cursorEl.style.height = '16px';
          cursorEl.style.backgroundColor = '#ef4444';
          cursorEl.style.borderRadius = '50%';
          cursorEl.style.border = '2px solid #ffffff';
        }

        try {
          if (!document.getElementById('__gpm_cursor_styles')) {
            const style = document.createElement('style');
            style.id = '__gpm_cursor_styles';
            style.textContent = '@keyframes gpmRippleAnim{0%{transform:translate(-50%,-50%) scale(0.2);opacity:0.9;}100%{transform:translate(-50%,-50%) scale(1.8);opacity:0;}}.gpm-ripple{position:fixed;pointer-events:none;width:32px;height:32px;border-radius:50%;background:rgba(239,68,68,0.25);border:2px solid #ef4444;animation:gpmRippleAnim 0.45s ease-out forwards;z-index:2147483646;}';
            (document.head || parent).appendChild(style);
          }
        } catch (styleErr) {}

        parent.appendChild(cursorEl);
      }
      return cursorEl;
    } catch (e) {
      return null;
    }
  }

  function setPos(x, y) {
    curX = x;
    curY = y;
    try {
      sessionStorage.setItem('__gpm_cursor_x', String(x));
      sessionStorage.setItem('__gpm_cursor_y', String(y));
    } catch(e) {}
    try {
      const c = ensureCursor();
      if (c) {
        c.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      }
    } catch(e) {}
  }

  function createRipple(x, y) {
    try {
      const parent = document.body || document.documentElement;
      if (!parent) return;
      const r = document.createElement('div');
      r.className = 'gpm-ripple';
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      parent.appendChild(r);
      setTimeout(() => {
        try { r.remove(); } catch(e) {}
      }, 500);
    } catch(e) {}
  }

  // Smooth Bezier human-like movement
  function moveSmooth(targetX, targetY, durationMs = 400) {
    return new Promise((resolve) => {
      try { ensureCursor(); } catch(e) {}
      const startX = curX;
      const startY = curY;
      const dist = Math.hypot(targetX - startX, targetY - startY);

      const midX = (startX + targetX) / 2;
      const midY = (startY + targetY) / 2;
      const deviation = Math.min(dist * 0.2, 50) * (Math.random() > 0.5 ? 1 : -1);
      const ctrlX = midX - (targetY - startY) * 0.15 + (Math.random() - 0.5) * 20;
      const ctrlY = midY + (targetX - startX) * 0.15 + deviation;

      const steps = Math.max(12, Math.min(40, Math.floor(durationMs / 15)));
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const t = step / steps;
        const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const x = Math.round((1 - easedT) * (1 - easedT) * startX + 2 * (1 - easedT) * easedT * ctrlX + easedT * easedT * targetX);
        const y = Math.round((1 - easedT) * (1 - easedT) * startY + 2 * (1 - easedT) * easedT * ctrlY + easedT * easedT * targetY);

        setPos(x, y);

        try {
          const hoveredEl = document.elementFromPoint(x, y);
          if (hoveredEl) {
            hoveredEl.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
          }
        } catch(e) {}

        if (step >= steps) {
          clearInterval(interval);
          setPos(targetX, targetY);
          resolve();
        }
      }, Math.max(8, Math.floor(durationMs / steps)));
    });
  }

  async function clickAt(x, y) {
    setPos(x, y);
    const c = ensureCursor();
    if (c) {
      c.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(0.82)';
    }
    createRipple(x, y);

    const el = document.elementFromPoint(x, y);
    if (el) {
      const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
      el.dispatchEvent(new MouseEvent('mouseover', opts));
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      await new Promise(r => setTimeout(r, 60));
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.dispatchEvent(new MouseEvent('click', opts));
      if (typeof el.click === 'function') {
        try { el.click(); } catch(e) {}
      }
    }

    setTimeout(() => {
      const cur = ensureCursor();
      if (cur) {
        cur.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(1)';
      }
    }, 120);

    return { success: true, x, y };
  }

  async function clickXPath(xpath, frameXPath) {
    try {
      let targetDoc = document;
      let offsetX = 0;
      let offsetY = 0;
      if (frameXPath) {
        const frameRes = document.evaluate(frameXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const frameEl = frameRes.singleNodeValue;
        if (frameEl) {
          const fRect = frameEl.getBoundingClientRect();
          offsetX = Math.round(fRect.left);
          offsetY = Math.round(fRect.top);
          try {
            if (frameEl.contentDocument) targetDoc = frameEl.contentDocument;
            else if (frameEl.contentWindow && frameEl.contentWindow.document) targetDoc = frameEl.contentWindow.document;
          } catch(e) {}
        }
      }
      const res = targetDoc.evaluate(xpath, targetDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const el = res.singleNodeValue;
      if (!el) return { success: false, error: 'Element not found: ' + xpath };

      if (typeof el.scrollIntoView === 'function') {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          await new Promise(r => setTimeout(r, 200));
        } catch(e) {}
      }

      const rect = el.getBoundingClientRect();
      const targetX = Math.round(rect.left + rect.width / 2 + offsetX + (Math.random() - 0.5) * Math.min(10, rect.width * 0.3));
      const targetY = Math.round(rect.top + rect.height / 2 + offsetY + (Math.random() - 0.5) * Math.min(10, rect.height * 0.3));

      try {
        await moveSmooth(targetX, targetY, 400);
      } catch(e) {}

      try {
        await clickAt(targetX, targetY);
      } catch(e) {}

      // Ensure element itself also receives click dispatch / method
      if (typeof el.click === 'function') {
        try { el.click(); } catch(e) {}
      }

      return { success: true, x: targetX, y: targetY };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }

  async function clickCoordinates(x, y) {
    try {
      await moveSmooth(x, y, 350);
    } catch(e) {}
    return await clickAt(x, y);
  }

  window.__gpmVirtualMouse = {
    init: () => ensureCursor(),
    moveTo: moveSmooth,
    clickAt,
    clickXPath,
    clickCoordinates,
    getPos: () => ({ x: curX, y: curY }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { try { ensureCursor(); } catch(e) {} }, { once: true });
  } else {
    try { ensureCursor(); } catch(e) {}
  }

  return window.__gpmVirtualMouse;
})();
`;

/**
 * Returns a script string to initialize the virtual mouse on the page
 */
export const getVirtualMouseInitScript = () => VIRTUAL_MOUSE_SCRIPT;

/**
 * Returns a script to move and click by XPath using the virtual mouse
 */
export const getVirtualMouseClickXPathScript = (xpath: string, frameXPath?: string) => `
(async () => {
  ${VIRTUAL_MOUSE_SCRIPT};
  return await window.__gpmVirtualMouse.clickXPath(${JSON.stringify(xpath)}, ${JSON.stringify(frameXPath || '')});
})()
`;

/**
 * Returns a script to move and click coordinates using the virtual mouse
 */
export const getVirtualMouseClickCoordsScript = (x: number, y: number) => `
(async () => {
  ${VIRTUAL_MOUSE_SCRIPT};
  return await window.__gpmVirtualMouse.clickCoordinates(${x}, ${y});
})()
`;
