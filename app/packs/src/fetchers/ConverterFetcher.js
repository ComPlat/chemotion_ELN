import 'whatwg-fetch';

export default class ConverterFetcher {
  static deleteProfile(identifier) {
    const requestOptions = { method: 'DELETE' };
    return fetch(`/api/v1/converter/profiles/${identifier}`, requestOptions)
      .then((response) => {
        if (!response.ok) { throw response; }
        return response;
      });
  }

  static fetchProfiles() {
    return fetch('/api/v1/converter/profiles', {
      credentials: 'same-origin',
      method: 'GET',
    }).then((response) => {
      if (response.status === 200) {
        return response.json();
      }
      return null;
    })
      .then(json => json)
      .catch((errorMessage) => { console.error(errorMessage); });
  }

  static fetchTables(file) {
    const data = new FormData();
    data.append('file[]', file);
    return fetch('/api/v1/converter/tables', {
      credentials: 'same-origin',
      contentType: 'application/json',
      method: 'POST',
      body: data,
    }).then((response) => {
      if (response.ok) {
        return response.json();
      }
      return null;
    })
      .then(json => json)
      .catch((errorMessage) => { console.error(errorMessage); });
  }


  static createProfile(data) {
    const requestOptions = {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    };

    let ok;
    return fetch('/api/v1/converter/profiles', requestOptions)
      .then((response) => {
        ok = response.ok;
        return response.json();
      })
      .then((info) => {
        if (ok) {
          return info;
        }
        throw info;
      });
  }


  static updateProfile(data, identifier) {
    const requestOptions = {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    let ok;
    return fetch(`/api/v1/converter/profiles/${identifier}`, requestOptions)
      .then((response) => {
        // eslint-disable-next-line prefer-destructuring
        ok = response.ok;
        return response.json();
      })
      .then((info) => {
        if (ok) {
          return info;
        }
        throw new Error(info);
      });
  }
}
