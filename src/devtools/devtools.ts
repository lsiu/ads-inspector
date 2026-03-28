// DevTools page - creates the panel
chrome.devtools.panels.create(
  'Ad Inspector',
  '',
  'panel.html',
  () => {
    console.log('[Ad Inspector] DevTools panel created');
  }
);
