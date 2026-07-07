import ApiClient from 'src/api_clients/ChemotionApiClient';

const emptyVariation = (elementId) => ({
  id: null, elementId, variations: {}, layout: {},
});

const pickVariation = (elementId) => (response) => response.json()
  .then((json) => (json && json.element_variation ? json.element_variation : emptyVariation(elementId)));

const logAndNull = (error) => { console.log(error); return null; };

export default class ElementVariationFetcher {
  static fetchByElementId(elementId) {
    return ApiClient.getJson(`/api/v1/element_variations/${elementId}`, {
      handleResponseSuccess: pickVariation(elementId),
      handleResponseError: logAndNull,
    });
  }

  static update(elementId, variations, layout) {
    return ApiClient.putJson(`/api/v1/element_variations/${elementId}`, {
      body: { variations, layout: layout || {} },
      handleResponseSuccess: pickVariation(elementId),
      handleResponseError: logAndNull,
    });
  }
}
