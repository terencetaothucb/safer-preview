(() => {
  'use strict';
  const status = document.querySelector('#status');
  const heading = document.querySelector('#heading');
  const gate = document.querySelector('#gate');
  let lastFragment = '';
  async function unlock() {
    const fragment = location.hash;
    if (fragment === lastFragment) return;
    lastFragment = fragment;
    document.querySelector('#preview')?.remove();
    gate.hidden = false;
    const encoded = new URLSearchParams(fragment.slice(1)).get('key');
    if (!encoded || !/^[A-Za-z0-9_-]{43}$/.test(encoded)) {
      heading.textContent = 'Private preview';
      status.textContent = '请使用项目负责人分享的完整链接访问。\nOpen the complete private link shared with you.';
      return;
    }
    heading.textContent = 'Opening your preview';
    status.textContent = '正在安全打开网页… / Decrypting in your browser…';
    try {
      if (!window.isSecureContext || !crypto.subtle) throw new Error('secure context');
      const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/') + '='), c => c.charCodeAt(0));
      if (bytes.length !== 32) throw new Error('key size');
      const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);
      bytes.fill(0);
      const response = await fetch('./payload.bin', {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'});
      if (!response.ok) throw new Error('load');
      const payload = new Uint8Array(await response.arrayBuffer());
      if (new TextDecoder().decode(payload.slice(0,4)) !== 'SFR1') throw new Error('format');
      const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv:payload.slice(4,16), additionalData:new TextEncoder().encode('SAFER preview v1'), tagLength:128}, key, payload.slice(16));
      if (location.hash !== fragment) return;
      const frame = document.createElement('iframe');
      frame.id = 'preview';
      frame.title = 'Research program preview';
      frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.srcdoc = new TextDecoder('utf-8', {fatal:true}).decode(plain);
      document.body.append(frame);
      gate.hidden = true;
    } catch {
      heading.textContent = 'Unable to open this preview';
      status.textContent = '链接可能不完整或已失效，请向分享者索取最新链接。\nThe link may be incomplete or no longer valid. Please request a new link.';
    }
  }
  addEventListener('hashchange', unlock);
  // Run once even when there is no fragment, to show the locked state.
  lastFragment = '\u0000';
  unlock();
})();
