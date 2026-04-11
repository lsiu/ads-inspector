import injectedScript from './injected.ts?script';

// Content script - bridges page context with background service worker
console.log('[Ad Inspector] Content script starting...');

// Inject the script into the page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL(injectedScript);
(document.head || document.documentElement).appendChild(script);

console.log('[Ad Inspector] Injected script tag added to page');

// Listen for messages FROM the page and send them TO the background
window.addEventListener('message', (event) => {
  if (event.data && event.data.source === 'auction-inspector') {
    console.log('[Ad Inspector] Received message from page:', event.data.type, event);

    chrome.runtime.sendMessage({
      type: event.data.type,
      payload: event.data.payload,
    });
  }
});

// Listen for messages FROM the background and forward TO the page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HIGHLIGHT_SLOT') {
    console.log('[Ad Inspector] Forwarding highlight to page:', message.payload);
    window.postMessage({
      source: 'auction-inspector',
      type: 'HIGHLIGHT_SLOT',
      payload: message.payload,
    });
  }
});

// Notify background that content script is loaded
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_LOADED',
  payload: { url: window.location.href },
});
