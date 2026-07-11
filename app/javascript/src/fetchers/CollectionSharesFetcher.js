import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class CollectionSharesFetcher {
  static getCollectionSharedWithUsers(collectionId) {
    return ApiClient.getJson(`/api/v1/collection_shares.json?collection_id=${collectionId}`)
      .then((json) => json.collection_shares);
  }

  // The current user's own contributing shares on a collection (their direct share + their groups'),
  // for the shared-to-me provenance popover.
  static getMyCollectionShares(collectionId) {
    return ApiClient.getJson(`/api/v1/collection_shares/for_me.json?collection_id=${collectionId}`)
      .then((json) => json.collection_shares);
  }

  static addCollectionShare(params) {
    return ApiClient.postJson('/api/v1/collection_shares', { body: params });
  }

  static updateCollectionShare(collectionShareId, params) {
    return ApiClient.putJson(`/api/v1/collection_shares/${collectionShareId}`, { body: params })
      .then((json) => json.collection_share);
  }

  /**
   * Deletes a collection share. The endpoint replies 204 No Content, so success
   * is read from the HTTP status.
   *
   * @param {number} collectionShareId - id of the collection share to delete
   * @returns {Promise<boolean>} true on success (see ChemotionApiClient.apiRequest)
   */
  static deleteCollectionShare(collectionShareId) {
    return ApiClient.deleteRequest(`/api/v1/collection_shares/${collectionShareId}`, {
      handleResponseSuccess: (response) => response.ok,
    });
  }
}
