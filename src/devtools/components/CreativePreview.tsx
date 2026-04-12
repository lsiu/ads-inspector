import React from 'react';
import type { GptInfo } from '../../shared/types';

interface CreativePreviewProps {
  adHtml: string | undefined;
  gpt?: GptInfo | undefined;
}

/**
 * CreativePreview component showing both rendered preview and raw ad markup.
 * Used in both auction-level details and bid-level expanded view.
 */
const CreativePreview: React.FC<CreativePreviewProps> = ({ adHtml, gpt }) => {
  return (
    <>
      {/* Creative Preview */}
      {adHtml ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Creative Preview
          </h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div
              className="bg-white rounded p-2"
              dangerouslySetInnerHTML={{ __html: adHtml }}
            />
          </div>
        </div>
      ) : gpt && !adHtml ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Creative Preview
          </h3>
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
            <p>
              Creative HTML is not accessible for GPT-rendered ads.
              Ads are rendered in cross-origin iframes via SafeFrame.
            </p>
          </div>
        </div>
      ) : null}

      {/* Ad Markup */}
      {adHtml && (
        <>
          <h3 className="text-lg font-semibold text-white mb-2">
            Ad Markup
          </h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="bg-white rounded p-2">
              <pre className="text-xs text-black whitespace-pre-wrap break-words">
                {adHtml}
              </pre>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default CreativePreview;
