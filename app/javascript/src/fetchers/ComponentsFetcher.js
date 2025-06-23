import 'whatwg-fetch';

export default class ComponentsFetcher {
  /**
   * Fetches components for a given sample by its ID.
   * @param {number|string} sampleId - The ID of the sample
   * @returns {Promise<Object[]>} A promise resolving to an array of component objects
   */
  static fetchComponentsBySampleId(sampleId) {
    return fetch(`/api/v1/components/${sampleId}`, {
      credentials: 'same-origin',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch components');
        }
        return response.json();
      })
      .catch((errorMessage) => {
        console.error(errorMessage);
      });
  }

  /**
   * Saves or updates components for a given sample.
   * Sends a PUT request with serialized component data.
   * @param {Object} sample - The sample object (must have an id)
   * @param {Object[]} components - Array of component objects (must implement serializeComponent)
   * @returns {Promise<Object>} A promise resolving to the updated components response
   */
  static saveOrUpdateComponents(sample, components) {
    const serializedComponents = components.map((component) => component.serializeComponent());
    return fetch('/api/v1/components', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sample_id: sample.id,
        components: serializedComponents,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to update components');
        }
        return response.json();
      })
      .catch((error) => {
        console.error('Error updating components:', error);
      });
  }
}
