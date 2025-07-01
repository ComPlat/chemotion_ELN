import 'whatwg-fetch';

export default class TemplateFetcher {
  static commonTemplates() {
    return fetch('/json/common_templates_list.json', {
      credentials: 'same-origin',
    })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load common templates');
        return response.json();
      })
      .catch((error) => {
        console.error('Error loading templates:', error);
        return [];
      });
  }
}
