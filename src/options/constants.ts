// Storage keys used in Options page
export const STORAGE_KEYS = {
  HIGHLIGHTED_BIDDER: 'highlightedBidder',
  SOURCE_DETECTION_CONFIG: 'sourceDetectionConfig',
} as const;

// Tailwind CSS classes for consistent styling
export const BUTTON_CLASSES = {
  PRIMARY: 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors',
  SECONDARY: 'px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors',
} as const;

export const SECTION_CLASSES = {
  CONTAINER: 'bg-gray-800 rounded-lg p-6 mb-6',
  TITLE: 'text-xl font-semibold text-white mb-4',
  TEXT: 'text-gray-400 mb-4',
  INPUT: 'flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
  INPUT_FULL: 'w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
} as const;

export const STATUS_CLASSES = {
  SUCCESS: 'p-3 bg-green-900/30 border border-green-700 rounded-lg',
  SUCCESS_TEXT: 'text-green-400',
  ERROR: 'p-3 bg-red-900/30 border border-red-700 rounded-lg',
  ERROR_TEXT: 'text-red-400',
  WARNING: 'p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg',
  WARNING_TEXT: 'text-yellow-400',
} as const;

