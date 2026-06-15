import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class UserSettingsFetcher {
  static searchRorOrganizations(query, country = '') {
    const countryParam = country ? `&country=${encodeURIComponent(country)}` : '';
    return ApiClient.getJson(`/api/v1/public/affiliations/ror_search?q=${encodeURIComponent(query)}${countryParam}`)
      .then((data) => (data || []).map((item) => ({
        value: item.ror_id,
        label: item.name,
        country: item.country,
      })));
  }

  static getLocalOrganizations() {
    return ApiClient.getJson('/api/v1/public/affiliations/organizations')
      .then((data) => (data || []).filter(Boolean));
  }

  static getAutoCompleteSuggestions(type, organization = '', department = '') {
    const params = new URLSearchParams();
    if (organization) params.append('organization', organization);
    if (department) params.append('department', department);
    const query = params.toString() ? `?${params.toString()}` : '';

    return ApiClient.getJson(`/api/v1/public/affiliations/${type}${query}`)
      .then((data) => (data || [])
        .filter((item) => item && item.trim() !== '')
        .map((item) => ({ value: item, label: item })));
  }

  static getPendingSuggestions() {
    return ApiClient.getJson('/api/v1/affiliation_suggestions?status=pending');
  }

  static getSuggestionsByStatus(status) {
    return ApiClient.getJson(`/api/v1/affiliation_suggestions?status=${status}`);
  }

  static createSuggestion(params) {
    return ApiClient.postJson('/api/v1/affiliation_suggestions', { body: params });
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
