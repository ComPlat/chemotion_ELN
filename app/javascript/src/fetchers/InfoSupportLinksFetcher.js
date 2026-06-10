import 'whatwg-fetch';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export default class InfoSupportLinksFetcher {
  static fetchAdmin() {
    return fetch('/api/v1/admin/info_support_links', {
      credentials: 'same-origin',
    }).then((response) => response.json());
  }

  static create(params) {
    return fetch('/api/v1/admin/info_support_links', {
      credentials: 'same-origin',
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(params),
    }).then((response) => response.json());
  }

  static update(id, params) {
    return fetch(`/api/v1/admin/info_support_links/${id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(params),
    }).then((response) => response.json());
  }

  static delete(id) {
    return fetch(`/api/v1/admin/info_support_links/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
    });
  }
}
