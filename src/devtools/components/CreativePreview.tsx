import React from 'react';
import type { GptInfo } from '../../shared/types';

interface CreativePreviewProps {
  adHtml: string | undefined;
  gpt?: GptInfo | undefined;
}

/**
 * Extract all unique domains from URLs found in HTML content.
 * Handles http://, https://, and protocol-relative URLs (//)
 */
function extractDomainsFromHtml(html: string): string[] {
  // Match URLs in various formats: http://, https://, //
  const urlRegex = /(?:https?:\/\/|\/\/)(?:["']?)([^"'\s\/>]+)/gi;
  const domains = new Set<string>();
  
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    const rawDomain = match[1];
    // Extract just the domain (remove port, path, query params)
    const domain = rawDomain.split('/')[0].split('?')[0].split(':')[0];
    // Filter out common false positives (base64, data URIs, etc.)
    if (domain && !domain.startsWith('data:') && !domain.startsWith('base64')) {
      domains.add(domain);
    }
  }
  
  return Array.from(domains).sort();
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

          {/* Extracted Domains */}
          {(() => {
            const domains = extractDomainsFromHtml(adHtml);
            return domains.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Extracted Domains ({domains.length})
                </h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {domains.map((domain) => (
                      <span
                        key={domain}
                        className="px-2 py-1 text-xs bg-gray-700 text-blue-300 rounded font-mono"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null;
          })()}
        </>
      )}
    </>
  );
};

export default CreativePreview;
