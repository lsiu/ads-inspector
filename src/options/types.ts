import type { SourceDetectionConfig } from '../shared/types';

export type SectionStatus = 'idle' | 'success' | 'error' | 'saved';

export interface OptionsState {
  directoryName: string;
  directoryStatus: SectionStatus;
  directoryError: string;
  highlightedBidder: string;
  bidderStatus: SectionStatus;
  sourceDetection: SourceDetectionConfig;
  sourceDetectionStatus: SectionStatus;
}

export const INITIAL_OPTIONS_STATE: OptionsState = {
  directoryName: '',
  directoryStatus: 'idle',
  directoryError: '',
  highlightedBidder: '',
  bidderStatus: 'idle',
  sourceDetection: {
    adMarkupPattern: 'adsrvr.org/bid/feedback',
    attributedBidder: 'ttd',
    enabled: true,
  },
  sourceDetectionStatus: 'idle',
};
