import 'whatwg-fetch';

import { camelize, decamelize } from 'humps';

const shallowCamelizeKeys = (obj) => {
  return Object.keys(obj).reduce((newObj, key) => {
    // eslint-disable-next-line no-param-reassign
    newObj[camelize(key)] = obj[key];
    return newObj;
  }, {});
};

export default class TextTemplatesFetcher {
  static fetchTextTemplates(elementName) {
    return fetch(`/api/v1/text_templates/${decamelize(elementName)}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => shallowCamelizeKeys(json))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchPredefinedTemplateNames() {
    return fetch('/api/v1/text_templates/predefinedNames', {
      credentials: 'same-origin',
      method: 'GET'
    }).then(response => response.json())
      .then(json => json.text_templates)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchPredefinedTemplateByNames(names) {
    const params = names.map(n => `name[]=${n}`).join('&');

    return fetch(`/api/v1/text_templates/by_name?${params}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then(response => response.json())
      .then(json => json.text_templates)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateTextTemplates(elementName, template) {
    return fetch(`/api/v1/text_templates/${decamelize(elementName)}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(template)
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static deletePredefinedTemplateByName(name) {
    return fetch(`/api/v1/text_templates/by_name?name=${name}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
