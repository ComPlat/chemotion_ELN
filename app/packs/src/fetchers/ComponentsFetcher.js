import 'whatwg-fetch';

export default class ComponentsFetcher {
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

  static saveOrUpdateComponents(sample, components) {
    const serializedComponents = components.map(component => (component.serializeComponent()));
    return fetch( '/api/v1/components', {
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
        throw new Error(`Failed to update components`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error(`Error updating components:`, error);
    });
  }
}
