import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class CollectionsFetcher {
  static fetchCollections() {
    return ApiClient.get_json('/api/v1/collections')
  }

  static fetchByCollectionId(collectionId) {
    return ApiClient.get_json(`/api/v1/collections/${collectionId}`)
                    .then(json => json.collection)
  }

  static addCollection(params) {
    return ApiClient.post_json('/api/v1/collections', { body: params })
                    .then(json => json.collection)
  }

  static buldUpdateForOwnCollections(params) {
    return ApiClient.post_json('/api/v1/collections/bulk_update_own_collections', { body: params })
                    .then(json => json.collections)
  }

  static updateCollection(collectionId, params) {
    return ApiClient.put_json(`/api/v1/collections/${collectionId}`, { body: params })
                    .then(json => json.collection)
  }

  static deleteCollection(collectionId) {
    return ApiClient.delete_request(`/api/v1/collections/${collectionId}`)
                    .then(json => json.collections)
  }

  static exportCollections(collectionIds) {
    return ApiClient.post_json('/api/v1/collections/export', { body: collectionIds })
  }

  static importCollections(params) {
    const data = new FormData();
    data.append('file', params.file);

    return ApiClient.post_form_data('/api/v1/collections/import/', { body: data })
  }
}
