import 'whatwg-fetch';

export default class GenericBaseFetcher {
  static exec(path, method) {
    return fetch(`/api/v1/${path}`, { credentials: 'same-origin', method })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static execData(params, path, method = 'POST') {
    return fetch(`/api/v1/${path}`, {
      credentials: 'same-origin',
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static deActivateKlass(params) {
    return fetch('/api/v1/generic_elements/de_activate_klass', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static deleteKlass(params) {
    return fetch(`/api/v1/generic_elements/delete_klass/${params.id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static deleteKlassRevision(params) {
    return fetch('/api/v1/generic_elements/delete_klass_revision', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchKlassRevisions(id, klass) {
    return fetch(
      `/api/v1/generic_elements/klass_revisions.json?id=${id}&klass=${klass}`,
      { credentials: 'same-origin' }
    )
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchUnitsSystem() {
    return fetch('/units_system/units_system.json', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static updateTemplate(params) {
    return fetch('/api/v1/generic_elements/update_template', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}
