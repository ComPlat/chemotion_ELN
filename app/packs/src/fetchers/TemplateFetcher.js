import 'whatwg-fetch';

export default class TemplateFetcher {
  static userTemplates(query) {
    return fetch(`/api/v1/ketcher/templates_search?query=${query}`, {
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static commonTemplates() {
    return fetch('/api/v1/ketcher/common_templates_list', {
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}
