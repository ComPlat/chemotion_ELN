import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class InfoSupportLinksFetcher {
  static fetchAdmin() {
    return ApiClient.getJson('/api/v1/admin/info_support_links');
  }

  static create(params) {
    return ApiClient.postJson('/api/v1/admin/info_support_links', { body: params });
  }

  static update(id, params) {
    return ApiClient.putJson(`/api/v1/admin/info_support_links/${id}`, { body: params });
  }

  static delete(id) {
    return ApiClient.deleteRequest(`/api/v1/admin/info_support_links/${id}`);
  }
}
