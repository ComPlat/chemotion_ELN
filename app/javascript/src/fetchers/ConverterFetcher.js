import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class ConverterFetcher {
  static deleteProfile(profile) {
    return ApiClient.deleteRequest(`/api/v1/converter/profiles/${profile.id}`, {
      handleResponseSuccess: (response) => {
        if (!response.ok) { throw response; }
        return response;
      }
    });
  }

  static fetchProfiles() {
    return ApiClient.getJson('/api/v1/converter/profiles');
  }

  static fetchOptions() {
    return ApiClient.getJson('/api/v1/converter/options');
  }

  static fetchTables(file) {
    const data = new FormData();
    data.append('file[]', file);
    return ApiClient.postFormData('/api/v1/converter/tables', { body: data });
  }

  static createProfile(profile) {
    return ApiClient.postJson('/api/v1/converter/profiles', { body: profile });
  }

  static updateProfile(profile) {
    return ApiClient.putJson('/api/v1/converter/profiles', { body: profile });
  }
}
