import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class TemplateFetcher {
  static commonTemplates() {
    return ApiClient.getJson('/json/ketcher_common_templates', {
      handleResponseSuccess: (response) => {
        if (response.ok === false) {
          throw new Error('Failed to load common templates');
        }
        return response.json();
      }
    });
  }
}
