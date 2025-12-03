import 'whatwg-fetch';

export default class TemplateFetcher {
  static commonTemplates() {
    return fetch('/json/ketcher_common_templates.json', {
      credentials: 'same-origin',
    })
      .then((response) => {
        if (!response.ok) return [];
        return response.json();
      })
      .catch(() => []);
  }
}
