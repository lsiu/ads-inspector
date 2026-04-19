import React from 'react';
import { BUTTON_CLASSES, SECTION_CLASSES, STATUS_CLASSES } from '../constants';
import type { SectionStatus } from '../types';

interface HighlightedBidderSectionProps {
  bidder: string;
  status: SectionStatus;
  onBidderChange: (bidder: string) => void;
  onSave: () => void;
  onClear: () => void;
}

export const HighlightedBidderSection: React.FC<HighlightedBidderSectionProps> = ({
  bidder,
  status,
  onBidderChange,
  onSave,
  onClear,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSave();
    }
  };

  return (
    <div className={SECTION_CLASSES.CONTAINER}>
      <h2 className={SECTION_CLASSES.TITLE}>Highlighted Bidder</h2>
      <p className={SECTION_CLASSES.TEXT}>
        Enter a bidder key to highlight in the auction list. When this bidder participates in an auction, their name will be shown next to the bid count.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={bidder}
          onChange={(e) => onBidderChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. ttd, appnexus"
          className={SECTION_CLASSES.INPUT}
        />
        <button
          onClick={onSave}
          className={BUTTON_CLASSES.PRIMARY}
        >
          Save
        </button>
        {bidder && (
          <button
            onClick={onClear}
            className={BUTTON_CLASSES.SECONDARY}
          >
            Clear
          </button>
        )}
      </div>
      {status === 'saved' && (
        <div className={`mt-3 ${STATUS_CLASSES.SUCCESS}`}>
          <p className={STATUS_CLASSES.SUCCESS_TEXT}>Highlighted bidder saved!</p>
        </div>
      )}
    </div>
  );
};
