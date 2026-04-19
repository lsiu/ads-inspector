import React from 'react';
import { BUTTON_CLASSES, SECTION_CLASSES, STATUS_CLASSES } from '../constants';
import type { SectionStatus } from '../types';
import type { SourceDetectionConfig } from '../../shared/types';

interface SourceDetectionSectionProps {
  config: SourceDetectionConfig;
  status: SectionStatus;
  onConfigChange: (config: SourceDetectionConfig) => void;
  onSave: () => void;
}

export const SourceDetectionSection: React.FC<SourceDetectionSectionProps> = ({
  config,
  status,
  onConfigChange,
  onSave,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSave();
    }
  };

  return (
    <div className={SECTION_CLASSES.CONTAINER}>
      <h2 className={SECTION_CLASSES.TITLE}>Source Detection</h2>
      <p className={SECTION_CLASSES.TEXT}>
        Configure automatic detection of ad sources by pattern matching. When an ad markup contains the specified pattern and the bidder is different from the attributed bidder, a source label will be shown.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Enable Source Detection</label>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onConfigChange({ ...config, enabled: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Ad Markup Pattern (text to search for)</label>
          <input
            type="text"
            value={config.adMarkupPattern}
            onChange={(e) => onConfigChange({ ...config, adMarkupPattern: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="e.g. adsrvr.org/bid/feedback"
            className={SECTION_CLASSES.INPUT_FULL}
          />
          <p className="text-xs text-gray-500 mt-1">The text to look for in ad markup</p>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Attributed Bidder</label>
          <input
            type="text"
            value={config.attributedBidder}
            onChange={(e) => onConfigChange({ ...config, attributedBidder: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="e.g. ttd"
            className={SECTION_CLASSES.INPUT_FULL}
          />
          <p className="text-xs text-gray-500 mt-1">The bidder name to attribute when pattern is detected</p>
        </div>
        <button
          onClick={onSave}
          className={BUTTON_CLASSES.PRIMARY}
        >
          Save Source Detection Config
        </button>
        {status === 'saved' && (
          <div className={STATUS_CLASSES.SUCCESS}>
            <p className={STATUS_CLASSES.SUCCESS_TEXT}>Source detection config saved!</p>
          </div>
        )}
      </div>
    </div>
  );
};
