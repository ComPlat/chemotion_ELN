import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class CollectionElementsFetcher {
  static addElementsToCollection(params) {
    return ApiClient.postJson('/api/v1/collection_elements', { body: params });
  }

  /**
   * Removes the ui_state-selected elements from the collection. The endpoint
   * replies 204 No Content when everything was removed, or 200 with
   * `{ locked_sample_ids: [...] }` for samples that could not be unshared
   * because they belong to a reaction still in the collection.
   *
   * @param {object} params - { collection_id, ui_state }
   * @returns {Promise<object|null>} the parsed JSON body, or null on 204
   *   (see ChemotionApiClient.apiRequest)
   */
  static deleteElementsFromCollection(params) {
    return ApiClient.deleteRequest(`/api/v1/collection_elements/${params.collection_id}`, {
      body: JSON.stringify(params),
    });
  }
}
