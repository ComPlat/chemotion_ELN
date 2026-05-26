import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class CollectionElementsFetcher {
  static addElementsToCollection(params) {
    return ApiClient.postJson('/api/v1/collection_elements', { body: params });
  }

  static deleteElementsFromCollection(params) {
    return ApiClient.deleteRequest(`/api/v1/collection_elements/${params.collection_id}`, {
      body: JSON.stringify(params)
    });
  }
}
