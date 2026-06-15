import ApiClient from 'src/api_clients/ChemotionApiClient';
import { camelizeKeys, decamelize } from 'src/utilities/FetcherHelper';

export default class TextTemplatesFetcher {
  static fetchTextTemplates(elementName) {
    return ApiClient.getJson(`/api/v1/text_templates/by_type?type=${decamelize(elementName)}`)
      .then((json) => camelizeKeys(json));
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
    return ApiClient.deleteRequest(`/api/v1/text_templates/by_name?name=${name}`);
  }

  static fetchPersonalTemplates() {
    return fetch('/api/v1/text_templates/personal', {
      credentials: 'same-origin',
    }).then(response => response.json())
      .then(json => json.text_templates)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static createPersonalTemplate(template) {
    return fetch('/api/v1/text_templates/personal', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updatePersonalTemplate(template) {
    return fetch(`/api/v1/text_templates/personal/${template.id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static deletePersonalTemplate(id) {
    return fetch(`/api/v1/text_templates/personal/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
