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
  if (!Object.keys(dict).length) return;

  const replaceText = (s) => {
    if (!s) return s;
    const trimmed = s.trim();
    if (dict[trimmed]) return s.replace(trimmed, dict[trimmed]);
    return s;
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => {
    n.nodeValue = replaceText(n.nodeValue);
  });

  document.querySelectorAll('[placeholder]').forEach((el) => {
    const v = el.getAttribute('placeholder');
    if (v && dict[v]) el.setAttribute('placeholder', dict[v]);
  });

  document.querySelectorAll('[aria-label]').forEach((el) => {
    const v = el.getAttribute('aria-label');
    if (v && dict[v]) el.setAttribute('aria-label', dict[v]);
  });
})();
