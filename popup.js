const master = document.getElementById('master');
const list = document.getElementById('sites');
const status = document.getElementById('status');

let state = { enabled: true, sites: {} };
let currentSite = null;

function save() {
  chrome.storage.local.set(state);
}

function render() {
  master.checked = state.enabled;
  document.body.classList.toggle('off', !state.enabled);

  list.innerHTML = '';
  for (const site of SITES) {
    const on = state.sites[site.id] !== false;
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="label">
        <span>${site.name}</span>
        <small>${site.css}</small>
      </div>
      <label class="switch">
        <input type="checkbox" data-id="${site.id}" ${on ? 'checked' : ''}>
        <span class="slider"></span>
      </label>`;
    list.appendChild(li);
  }

  if (currentSite) {
    const on = state.enabled && state.sites[currentSite.id] !== false;
    status.textContent = on ? `Dark mode active on ${currentSite.name}` : `${currentSite.name} supported — currently off`;
    status.classList.toggle('active', on);
  } else {
    status.textContent = 'No dark CSS for this site yet';
    status.classList.remove('active');
  }
}

master.addEventListener('change', () => {
  state.enabled = master.checked;
  save();
  render();
});

list.addEventListener('change', (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  state.sites[id] = e.target.checked;
  save();
  render();
});

chrome.storage.local.get(['enabled', 'sites'], (stored) => {
  state.enabled = stored.enabled !== false;
  state.sites = stored.sites || {};
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      currentSite = tabs[0] && tabs[0].url ? siteFor(new URL(tabs[0].url).hostname) : null;
    } catch { currentSite = null; }
    render();
  });
});

// --- Page audit: find what's still light on the current tab, copy a report to the clipboard ---
function auditPage() {
  const lum = (c) => {
    const m = c.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/);
    if (!m || (m[4] !== undefined && +m[4] === 0)) return null;
    return 0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3];
  };
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    if (cls.length) s += '.' + cls.slice(0, 4).join('.');
    return s;
  };
  const light = [], blend = [], gradients = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'SVG') continue;
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area < 4000) continue;
    const s = getComputedStyle(el);
    const l = lum(s.backgroundColor);
    if (l !== null && l > 140) {
      light.push({ sel: sel(el), bg: s.backgroundColor, area: Math.round(area), inline: (el.getAttribute('style') || '').slice(0, 80) });
    }
    if (s.backgroundImage.includes('gradient')) gradients.push({ sel: sel(el), bgi: s.backgroundImage.slice(0, 90), area: Math.round(area) });
    if (s.mixBlendMode !== 'normal') blend.push({ sel: sel(el), mode: s.mixBlendMode });
  }
  light.sort((a, b) => b.area - a.area);
  gradients.sort((a, b) => b.area - a.area);
  const lines = [`# blindnt audit — ${location.href}`, `viewport ${innerWidth}x${innerHeight}, scrollY ${Math.round(scrollY)}`, ''];
  lines.push(`## light backgrounds (${light.length})`);
  for (const x of light.slice(0, 40)) lines.push(`${x.sel} | ${x.bg} | ${x.area}px²${x.inline ? ' | style="' + x.inline + '"' : ''}`);
  lines.push('', `## gradients (${gradients.length})`);
  for (const x of gradients.slice(0, 15)) lines.push(`${x.sel} | ${x.bgi}`);
  lines.push('', `## mix-blend-mode (${blend.length})`);
  for (const x of blend.slice(0, 15)) lines.push(`${x.sel} | ${x.mode}`);
  return lines.join('\n');
}

const auditBtn = document.getElementById('audit');
const auditMsg = document.getElementById('audit-msg');
const auditOut = document.getElementById('audit-out');

auditBtn.addEventListener('click', async () => {
  auditMsg.textContent = 'scanning…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: auditPage });
    auditOut.value = result;
    auditOut.hidden = false;
    try {
      await navigator.clipboard.writeText(result);
      auditMsg.textContent = 'copied to clipboard';
    } catch {
      auditOut.select();
      auditMsg.textContent = 'select + copy below';
    }
  } catch (e) {
    auditMsg.textContent = 'cannot scan this page';
    auditOut.value = String(e);
    auditOut.hidden = false;
  }
});
