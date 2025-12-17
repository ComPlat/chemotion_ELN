// Standard tabs that appear across most elements
const COMMON_TABS = ['properties', 'analyses'];

// Element-specific tab definitions
// These match the actual tabContentsMap in each element's Detail component
export const ELEMENT_AVAILABLE_TABS = {
  sample: [
    'properties',
    'analyses',
    'references',
    'results',
    'qc_curation',
    'measurements',
    'history',
    // Conditional tabs (computed_props, nmr_sim, inventory) are NOT included
    // They only appear when enabled and get added dynamically
  ],

  reaction: [
    'scheme',
    'properties',
    'references',
    'analyses',
    'green_chemistry',
    'variations',
    'history',
    // NO attachments
  ],

  wellplate: [
    'designer',
    'list',
    'properties',
    'analyses',
    'attachments',
    'history',
  ],

  screen: [
    'properties',
    'analyses',
    'research_plans',
    'history',
  ],

  research_plan: [
    'research_plan',
    'analyses',
    'attachments',
    'references',
    'wellplates',
    'metadata',
  ],

  cell_line: [
    'properties',
    'analyses',
    'references',
  ],

  device_description: [
    'properties',
    'detail',
    'analyses',
    'attachments',
    'maintenance',
    'history',
  ],

  vessel: [
    'properties',
  ],

  sequence_based_macromolecule_sample: [
    'properties',
    'analyses',
    'attachments',
    // NO history
  ],
};

/**
 * Get all available tabs for an element type
 * @param {string} elementType - The element type (e.g., 'sample', 'reaction')
 * @param {object} options - Optional filters
 * @param {array} options.segmentLabels - Additional segment labels to include
 * @returns {array} Array of available tab keys
 */
export function getAvailableTabs(elementType, options = {}) {
  const { segmentLabels = [] } = options;

  let tabs = ELEMENT_AVAILABLE_TABS[elementType] || COMMON_TABS;

  // Add segment labels
  if (segmentLabels.length > 0) {
    tabs = [...tabs, ...segmentLabels];
  }

  // Remove duplicates
  return [...new Set(tabs)];
}

/**
 * Get display name for a tab
 * @param {string} tabKey - The tab key
 * @returns {string} Display name for the tab
 */
export const TAB_DISPLAY_NAMES = {
  qc_curation: 'QC & curation',
  nmr_sim: 'NMR Simulation',
  literature: 'References',
  references: 'References',
  computed_props: 'Computed Properties',
  green_chemistry: 'Green Chemistry',
  research_plan: 'Research Plan',
  sequence_based_macromolecule_sample: 'Sequence Based Macromolecule Sample',
};

export function getTabDisplayName(tabKey) {
  return TAB_DISPLAY_NAMES[tabKey];
}
