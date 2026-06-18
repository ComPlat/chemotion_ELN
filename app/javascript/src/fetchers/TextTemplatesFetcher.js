import ApiClient from 'src/api_clients/ChemotionApiClient';
import { shallowCamelizeKeys, decamelize } from 'src/utilities/FetcherHelper';

export default class TextTemplatesFetcher {
  static fetchTextTemplates(elementName) {
    return ApiClient.getJson(`/api/v1/text_templates/by_type?type=${decamelize(elementName)}`)
      .then((json) => shallowCamelizeKeys(json));
  }

  static fetchPredefinedTemplateNames() {
    return ApiClient.getJson('/api/v1/text_templates/predefinedNames')
      .then((json) => json.text_templates);
  }

  static fetchPredefinedTemplateByNames(names) {
    const params = names.map((n) => `name[]=${encodeURIComponent(n)}`).join('&');
    return ApiClient.getJson(`/api/v1/text_templates/by_name?${params}`)
      .then((json) => json.text_templates);
  }

  static updateTextTemplates(elementName, template) {
    const body = { data: template, type: decamelize(elementName) };
    return ApiClient.putJson('/api/v1/text_templates/update', { body });
  }

  static updatePredefinedTemplates(template) {
    const url = '/api/v1/text_templates/predefined_text_template';
    const body = template;
    if (template.id) { return ApiClient.putJson(url, { body }); }
    return ApiClient.postJson(url, { body });
  }

  static deletePredefinedTemplateByName(name) {
    return ApiClient.deleteRequest(`/api/v1/text_templates/by_name?name=${encodeURIComponent(name)}`);
  }

  static fetchPersonalTemplates() {
    return ApiClient.getJson('/api/v1/text_templates/personal')
      .then((json) => json.text_templates);
  }

  static createPersonalTemplate(template) {
    return ApiClient.postJson('/api/v1/text_templates/personal', { body: template });
  }

  static updatePersonalTemplate(template) {
    return ApiClient.putJson(`/api/v1/text_templates/personal/${template.id}`, { body: template });
  }

  static deletePersonalTemplate(id) {
    return ApiClient.deleteRequest(`/api/v1/text_templates/personal/${id}`);
  }
}
