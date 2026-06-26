import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class UserSettingsFetcher {
  static getAutoCompleteSuggestions(type) {
    return ApiClient.getJson(`/api/v1/public/affiliations/${type}`)
      .then((json) => json
        .filter((item) => item && item.trim() !== '')
        .map((item) => ({ value: item, label: item })));
  }

  static getAllAffiliations() {
    return ApiClient.getJson('/api/v1/affiliations');
  }

  static createAffiliation(params) {
    return ApiClient.postJson('/api/v1/affiliations', { body: params });
  }

  static updateAffiliation(params) {
    return ApiClient.putJson('/api/v1/affiliations', { body: params });
  }

  static deleteAffiliation(id) {
    return ApiClient.deleteRequest(`/api/v1/affiliations/${id}`);
  }
}
