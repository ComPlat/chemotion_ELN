import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class ProfilesFetcher {
  static uploadUserTemplates(params) {
    return ApiClient.postJson('/api/v1/profiles', { body: params });
  }

  static deleteUserTemplate(params) {
    return ApiClient.deleteRequest('/api/v1/profiles', { body: JSON.stringify(params) });
  }
}
