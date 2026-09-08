import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class CollectionElementsFetcher {
  static addElementsToCollection(params) {
    return ApiClient.postJson('/api/v1/collection_elements', { body: params });
  }

  /**
   * Removes the ui_state-selected elements from the collection. The endpoint
   * replies 204 No Content when everything was removed, or 200 with
   * `{ locked_sample_ids: [...] }` for samples that could not be unshared
   * because they belong to a reaction or wellplate still in the collection.
   *
   * @param {object} params - { collection_id, ui_state }
   * @returns {Promise<object|null|undefined>} the parsed JSON body, null on 204,
   *   or undefined on a network/parse failure (see ChemotionApiClient.apiRequest).
   *   Callers must distinguish undefined (request failed) from null (success, no
   *   body): CollectionsStore.removeElementsFromCollection depends on this.
   */
  static deleteElementsFromCollection(params) {
    return ApiClient.deleteRequest(`/api/v1/collection_elements/${params.collection_id}`, {
      body: JSON.stringify(params),
    });
  }
}
