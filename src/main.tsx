import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Ad Auction Inspector</h1>
        <p className="text-gray-400 mb-6">
          This extension adds a custom panel to Chrome DevTools for monitoring Prebid.js and Google Tag Manager ad auctions.
        </p>
        <div className="bg-gray-800 rounded-lg p-6 text-left">
          <h2 className="text-lg font-semibold mb-3">How to use:</h2>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">1.</span>
              <span>Navigate to a page with Prebid.js ads</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">2.</span>
              <span>Open Chrome DevTools (F12)</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">3.</span>
              <span>Click on the "Ad Inspector" tab</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">4.</span>
              <span>View ad slots, bids, and winning creatives in real-time</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
