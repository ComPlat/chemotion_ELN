import 'whatwg-fetch';

export default class TemplateFetcher {
  static commonTemplates() {
    return fetch('/json/common_templates_list.json', {
      credentials: 'same-origin',
    })
      .then((response) => {
        if (!response.ok) return [];
        return response.json();
      })
      .catch(() => []);
  }
}
