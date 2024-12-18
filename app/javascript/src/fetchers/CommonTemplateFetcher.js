import 'whatwg-fetch';

export default class CommonTemplatesFetcher {
  static fetchCommonTemplates() {
    return fetch('/api/v1/ketcher/common_templates_list')
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => console.log(errorMessage));
  }
}
