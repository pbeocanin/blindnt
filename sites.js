// Registry of supported sites. Add a new entry + a CSS file under sites/ to support another site.
// `match` gets the page hostname (no port) and returns true if this site's CSS applies.
const SITES = [
  {
    id: 'amazon',
    name: 'Amazon (.de)',
    match: (h) => /(^|\.)amazon\.[a-z.]+$/.test(h),
    css: 'sites/amazon.css',
  },
];

function siteFor(hostname) {
  return SITES.find((s) => s.match(hostname)) || null;
}
