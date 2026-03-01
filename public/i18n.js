(async function () {
  const locale = (window.__LOCALE__ || 'en').toLowerCase();
  if (locale === 'en') return;

  let data;
  try {
    const res = await fetch('/i18n-data.json', { cache: 'no-store' });
    data = await res.json();
  } catch (e) {
    console.warn('i18n data load failed', e);
    return;
  }

  const dict = data?.[locale] || {};
  const keys = Object.keys(dict || {});
  if (!keys.length) return;

  // Exact match first (best quality), then phrase-level replacement for long strings.
  const phrasePairs = keys
    .filter((k) => {
      if (!k || typeof k !== 'string') return false;
      if (k.length < 10) return false; // avoid noisy single-word replacements
      if (!/[\s,.;:!?()\--]/.test(k)) return false;
      return true;
    })
    .sort((a, b) => b.length - a.length)
    .map((k) => [k, dict[k]]);

  const replaceText = (s) => {
    if (!s) return s;

    const trimmed = s.trim();
    if (dict[trimmed]) {
      return s.replace(trimmed, dict[trimmed]);
    }

    let out = s;
    for (const [from, to] of phrasePairs) {
      if (!from || !to || from === to) continue;
      if (out.includes(from)) out = out.split(from).join(to);
    }
    return out;
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => {
    n.nodeValue = replaceText(n.nodeValue);
  });

  document.querySelectorAll('[placeholder]').forEach((el) => {
    const v = el.getAttribute('placeholder');
    if (!v) return;
    if (dict[v]) {
      el.setAttribute('placeholder', dict[v]);
      return;
    }
    el.setAttribute('placeholder', replaceText(v));
  });

  document.querySelectorAll('[aria-label]').forEach((el) => {
    const v = el.getAttribute('aria-label');
    if (!v) return;
    if (dict[v]) {
      el.setAttribute('aria-label', dict[v]);
      return;
    }
    el.setAttribute('aria-label', replaceText(v));
  });
})();
