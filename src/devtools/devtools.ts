// DevTools page - creates the panel
chrome.devtools.panels.create(
  'Ad Inspector',
  '',
  'src/devtools/panel.html',
  () => {
    console.log('[Ad Inspector] DevTools panel created');
  }
);
