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
