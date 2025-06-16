/**
 * Get the metric prefix for a component field from its metrics array.
 *
 * @param {Array<string>} metrics - The metrics array from the component
 * @param {number} index - The index in the metrics array to check
 * @param {Array<string>} validPrefixes - Array of valid metric prefixes
 * @param {string} defaultPrefix - Default prefix to use if none found
 * @returns {string} The metric prefix to use
 */
const getMetricPrefix = (metrics, index, validPrefixes, defaultPrefix = 'm') => {
  if (metrics && metrics.length > index && validPrefixes.indexOf(metrics[index]) > -1) {
    return metrics[index];
  }
  return defaultPrefix;
};

/**
 * Common metric prefixes for molecular amounts (mol)
 * @type {Array<string>}
 */
const metricPrefixesMol = ['m', 'n'];

/**
 * Common metric prefixes for concentrations (mol/l)
 * @type {Array<string>}
 */
const metricPrefixesMolConc = ['m', 'n'];

/**
 * Gets the metric prefix for molecular amount (mol) from component metrics.
 * Uses index 2 of the metrics array with valid prefixes ['m', 'n'].
 *
 * @param {Object} component - The component object containing metrics
 * @returns {string} The metric prefix for mol units (default: 'm')
 */
const getMetricMol = (component) => getMetricPrefix(component.metrics, 2, metricPrefixesMol, 'm');

/**
 * Gets the metric prefix for concentration (mol/l) from component metrics.
 * Uses index 3 of the metrics array with valid prefixes ['m', 'n'].
 *
 * @param {Object} component - The component object containing metrics
 * @returns {string} The metric prefix for concentration units (default: 'm')
 */
const getMetricMolConc = (component) => getMetricPrefix(component.metrics, 3, metricPrefixesMolConc, 'm');

export {
  getMetricPrefix,
  getMetricMol,
  getMetricMolConc,
  metricPrefixesMol,
  metricPrefixesMolConc,
};
