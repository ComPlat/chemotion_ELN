import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class MlCollectionFetcher {
  // Resolves to { id, label, created } of the user's MLGenerated collection,
  // creating it on first use.
  static ensure() {
    return ApiClient.postJson('/api/v1/prediction/ml_collection');
  }
}
