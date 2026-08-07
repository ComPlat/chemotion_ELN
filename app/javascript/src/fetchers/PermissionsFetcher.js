import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class PermissionsFetcher {
  static fetchPermissionStatus(params) {
    return ApiClient.postJson('/api/v1/permissions/status/', { body: params })
      .then((json) => json);
  }
}
