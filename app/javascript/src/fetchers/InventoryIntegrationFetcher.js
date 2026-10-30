import ApiClient from 'src/api_clients/ChemotionApiClient';

const ADMIN = '/api/v1/admin/inventory_integration';

// Error responses resolve as { error } (see ChemotionApiClient), so callers check for it.
export default class InventoryIntegrationFetcher {
  static fetchFieldAccess(collectionId) {
    return ApiClient.getJson(`/api/v1/inventory_integration/collections/${collectionId}/field_access`);
  }

  static fetchAdapters() {
    return ApiClient.getJson(`${ADMIN}/adapters`);
  }

  static fetchInventories() {
    return ApiClient.getJson(`${ADMIN}/inventories`);
  }

  static fetchCandidateCollections(ownerId) {
    return ApiClient.getJson(`${ADMIN}/inventories/candidates?${new URLSearchParams({ owner_id: ownerId })}`);
  }

  static createInventory(params) {
    return ApiClient.postJson(`${ADMIN}/inventories`, { body: params });
  }

  static archiveInventory(id) {
    return ApiClient.putJson(`${ADMIN}/inventories/${id}/archive`, { body: {} });
  }

  static fetchConnections() {
    return ApiClient.getJson(`${ADMIN}/connections`);
  }

  static createConnection(params) {
    return ApiClient.postJson(`${ADMIN}/connections`, { body: params });
  }

  static updateConnection(id, params) {
    return ApiClient.putJson(`${ADMIN}/connections/${id}`, { body: params });
  }

  // action: test, activate or pause
  static connectionAction(id, action) {
    return ApiClient.postJson(`${ADMIN}/connections/${id}/${action}`, { body: {} });
  }

  static archiveConnection(id) {
    return ApiClient.deleteRequest(`${ADMIN}/connections/${id}`, {
      handleResponseSuccess: (response) => response.ok,
    });
  }

  static fetchMappingVersions(connectionId) {
    return ApiClient.getJson(`${ADMIN}/connections/${connectionId}/mapping_versions`);
  }

  static draftPresetMapping(connectionId) {
    return ApiClient.postJson(`${ADMIN}/connections/${connectionId}/mapping_versions`, { body: { preset: true } });
  }

  static acceptMappingVersion(connectionId, versionId) {
    const path = `${ADMIN}/connections/${connectionId}/mapping_versions/${versionId}/accept`;
    return ApiClient.postJson(path, { body: {} });
  }
}
