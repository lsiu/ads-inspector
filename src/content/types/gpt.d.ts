// types/gpt.d.ts

interface GPTEvent {
  serviceName: string;
  slot: googletag.Slot;
  lineItemId?: number;
  creativeId?: number;
  advertiserId?: number;
  isEmpty: boolean;
  sourceAgnosticLineItemId?: number;
  sourceAgnosticCreativeId?: number;
}

// Minimal definition for the GPT global object
declare namespace googletag {
  interface Slot {
    getSlotElementId(): string;
    getAdUnitPath(): string;
    getTargeting(key: string): string[];
  }
  
  interface PubAdsService {
    addEventListener(
      eventType: 'slotRenderEnded', 
      callback: (event: GPTEvent) => void
    ): void;
  }

  export let cmd: Array<() => void>;
  export function pubads(): PubAdsService;
}