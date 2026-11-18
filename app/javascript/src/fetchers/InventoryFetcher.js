import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class InventoryFetcher {
  static updateInventoryLabel(params) {
    return ApiClient.putJson('/api/v1/inventory/update_inventory_label', { body: params });
  }

  static fetchLabelsAndCollections() {
    return ApiClient.getJson('/api/v1/inventory/user_inventory_collections');
  }

  static fetchInventoryOfCollection(collectionId) {
    return ApiClient.getJson(`/api/v1/inventory/${collectionId}`);
  }
}
