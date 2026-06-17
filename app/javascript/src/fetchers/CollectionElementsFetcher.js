import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class CollectionElementsFetcher {
  static addElementsToCollection(params) {
    return ApiClient.postJson('/api/v1/collection_elements', { body: params });
  }

  /**
   * Removes the ui_state-selected elements from the collection. The endpoint
   * replies 204 No Content, so success is read from the HTTP status.
   *
   * @param {object} params - { collection_id, ui_state }
   * @returns {Promise<boolean>} true on success (see ChemotionApiClient.apiRequest)
   */
  static deleteElementsFromCollection(params) {
    return ApiClient.deleteRequest(`/api/v1/collection_elements/${params.collection_id}`, {
      body: JSON.stringify(params),
      handleResponseSuccess: (response) => response.ok,
    });
  }
}
