import type { AuctionEventType } from '../../shared/types';

export type PostEvent = (type: AuctionEventType, payload: Record<string, unknown>) => void;
export type LogFn = (msg: string, ...args: unknown[]) => void;

export function postEvent(type: AuctionEventType, payload: Record<string, unknown>) {
  window.postMessage({
    source: 'auction-inspector',
    type,
    payload: {
      pageUrl: window.location.href,
      timestamp: Date.now(),
      ...payload,
    },
  });
}

// Styled console.log with blue badge prefix
export const log: LogFn = (msg, ...args) => {
  console.log(
    '%c[Ad Inspector]%c ' + msg,
    'background:#3b82f6;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px',
    'color:inherit;font-weight:normal',
    ...args,
  );
};