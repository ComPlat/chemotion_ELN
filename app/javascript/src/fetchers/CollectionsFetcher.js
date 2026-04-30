import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class CollectionsFetcher {
  static fetchCollections() {
    return ApiClient.getJson('/api/v1/collections')
  }

  static fetchByCollectionId(collectionId) {
    return ApiClient.getJson(`/api/v1/collections/${collectionId}`)
                    .then(json => json.collection)
  }

  static addCollection(params) {
    return ApiClient.postJson('/api/v1/collections', { body: params })
                    .then(json => json.collection)
  }

  static buldUpdateForOwnCollections(params) {
    return ApiClient.postJson('/api/v1/collections/bulk_update_own_collections', { body: params })
                    .then(json => json.collections)
  }

  static updateCollection(collectionId, params) {
    return ApiClient.putJson(`/api/v1/collections/${collectionId}`, { body: params })
                    .then(json => json.collection)
  }

  static deleteCollection(collectionId) {
    return ApiClient.deleteRequest(`/api/v1/collections/${collectionId}`)
                    .then(json => json.collections)
  }

  static exportCollections(collectionIds) {
    return ApiClient.postJson('/api/v1/collections/export', { body: collectionIds })
  }

  static importCollections(params) {
    const data = new FormData();
    data.append('file', params.file);

    return ApiClient.postFormData('/api/v1/collections/import/', { body: data })
  }
}
