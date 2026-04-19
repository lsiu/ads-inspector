// Injected script - runs in page context and has access to window.pbjs
// This script forwards individual Prebid.js events to the content script via postMessage.
// No state is accumulated here — each event is sent as-is.

import { setupGptListener } from './injected/listeners/gpt';
import { setupGtmListener } from './injected/listeners/gtm';
import { setupHighlightListener } from './injected/listeners/highlight';
import { setupPrebidListener } from './injected/listeners/prebid';
import { log, postEvent } from './injected/shared';

log('Injected script loaded');

setupPrebidListener(log, postEvent);
setupGtmListener(log, postEvent);
setupGptListener(log, postEvent);
setupHighlightListener(log);
