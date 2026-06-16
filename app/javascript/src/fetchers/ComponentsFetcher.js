import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class ComponentsFetcher {
  /**
   * Fetches components for a given sample by its ID.
   * @param {number|string} sampleId - The ID of the sample
   * @returns {Promise<Object[]>} A promise resolving to an array of component objects
   */
  static fetchComponentsBySampleId(sampleId) {
    return ApiClient.getJson(`/api/v1/components/${sampleId}`, {
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        throw new Error('Failed to fetch components');
      },
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
    return ApiClient.putJson('/api/v1/components', {
      body: {
        sample_id: sample.id,
        components: serializedComponents,
      },
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        throw new Error('Failed to update components');
      },
    });
  }
}
