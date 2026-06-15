import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class CollectionSharesFetcher {
  static getCollectionSharedWithUsers(collectionId) {
    return ApiClient.getJson(`/api/v1/collection_shares.json?collection_id=${collectionId}`)
      .then((json) => json.collection_shares);
  }

  static addCollectionShare(params) {
    return ApiClient.postJson('/api/v1/collection_shares', { body: params });
  }

  static updateCollectionShare(collectionShareId, params) {
    return ApiClient.putJson(`/api/v1/collection_shares/${collectionShareId}`, { body: params })
      .then((json) => json.collection_share);
  }

  static deleteCollectionShare(collectionId) {
    return ApiClient.deleteRequest(`/api/v1/collection_shares/${collectionId}`);
  }
}
