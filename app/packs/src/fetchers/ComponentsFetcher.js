import 'whatwg-fetch';

export default class ComponentFetcher {
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
    .catch((error) => {
      console.error('Error fetching components:', error);
    });
  }

  static saveOrUpdateComponents(sample, components) {
    return fetch( '/api/v1/components', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sample_id: sample.id,
        components: components,
      }),
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to update components`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error(`Error updating components:`, error);
    });
  }
}
