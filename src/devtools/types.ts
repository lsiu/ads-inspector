import type { Bid, GptInfo } from '../shared/types';

export interface AuctionEvent {
  id: string;
  slotCode: string;
  auctionId: string;
  timestamp: number;
  bids: Bid[];
  winningBid?: Bid;
  sizes: number[][];
  gpt?: GptInfo;
}
