import ApiClient from 'src/api_clients/ChemotionApiClient';
import { downloadBlob, getFileName } from 'src/utilities/FetcherHelper';

const emptyVariation = (elementId) => ({
  id: null, elementId, variations: {}, layout: {},
});

const pickVariation = (elementId) => (response) => response.json()
  .then((json) => (json && json.element_variation ? json.element_variation : emptyVariation(elementId)));

const logAndNull = (error) => { console.log(error); return null; };

const rethrow = (error) => Promise.reject(error);

const rejectWithMessage = (response) => response.json()
  .catch(() => null)
  .then((json) => {
    const message = (json && (json.error || json.message)) || `Request failed (${response.status})`;
    return Promise.reject(new Error(message));
  });

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

  static exportXlsx(elementId) {
    return ApiClient.getJson(`/api/v1/element_variations/${elementId}/export`, {
      headers: {},
      handleResponseSuccess: (response) => {
        if (!response.ok) return rejectWithMessage(response);
        const fileName = getFileName(response) || `element_${elementId}_variations.xlsx`;
        return response.blob().then((blob) => {
          downloadBlob(fileName, blob);
          return fileName;
        });
      },
      handleResponseError: rethrow,
    });
  }

  static importXlsx(elementId, file) {
    const body = new FormData();
    body.append('file', file);

    return ApiClient.postFormData(`/api/v1/element_variations/${elementId}/import`, {
      body,
      handleResponseSuccess: (response) => {
        if (!response.ok) return rejectWithMessage(response);
        return response.json().then((json) => ({
          variation: (json && json.element_variation) || emptyVariation(elementId),
          warnings: (json && json.warnings) || [],
        }));
      },
      handleResponseError: rethrow,
    });
  }
}
