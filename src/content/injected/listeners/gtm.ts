import type { LogFn, PostEvent } from '../shared';

export function setupGtmListener(log: LogFn, postEvent: PostEvent) {
  // Also listen to GTM dataLayer
  const originalPush = (window as any).dataLayer?.push;

  if (!originalPush) {
    return;
  }

  (window as any).dataLayer.push = function (...args: any[]) {
    const result = originalPush.apply(this, args);

    args.forEach((arg: any) => {
      if (arg && typeof arg === 'object') {
        if (arg.event?.includes('ad') || arg.adUnit || arg.slot) {
          log('GTM ad event:', arg);
          postEvent('GTM_EVENT', { event: arg });
        }
      }
    });

    return result;
  };

  log('GTM dataLayer listener attached');
}