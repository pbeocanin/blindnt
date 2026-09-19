(() => {
  const site = siteFor(location.hostname);
  if (!site) return;

  const STYLE_ID = 'blindnt-style';
  const PRE_ID = 'blindnt-pre';
  let cssText = null;

  const root = () => document.documentElement;

  function isOn(state) {
    const enabled = state.enabled !== false;
    const siteOn = !state.sites || state.sites[site.id] !== false;
    return enabled && siteOn;
  }

  // Tiny inline rule so the page doesn't flash white while the real CSS is fetched.
  function pre() {
    if (document.getElementById(PRE_ID)) return;
    const s = document.createElement('style');
    s.id = PRE_ID;
    s.textContent = 'html{background:#121212 !important;color-scheme:dark}';
    root().appendChild(s);
  }

  async function apply() {
    pre();
    if (cssText === null) {
      const res = await fetch(chrome.runtime.getURL(site.css));
      cssText = await res.text();
    }
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      root().appendChild(s);
    }
    s.textContent = cssText;
  }

  function remove() {
    for (const id of [STYLE_ID, PRE_ID]) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
  }

  chrome.storage.local.get(['enabled', 'sites'], (state) => {
    if (isOn(state)) apply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    chrome.storage.local.get(['enabled', 'sites'], (state) => {
      if (isOn(state)) apply();
      else remove();
    });
  });
})();
