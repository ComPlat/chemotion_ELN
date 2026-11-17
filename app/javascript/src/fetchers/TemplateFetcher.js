import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class TemplateFetcher {
  // Resolves to the instance's common templates, or [] when the file cannot be loaded, so the
  // template picker stays usable (empty) instead of receiving undefined.
  static commonTemplates() {
    return ApiClient.getJson('/json/ketcher_common_templates.json', {
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        throw new Error('Failed to load common templates');
      },
      handleResponseError: (error) => {
        console.error('Error loading templates:', error);
        return [];
      },
    });
  }
}
