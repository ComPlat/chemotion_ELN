import 'whatwg-fetch';

export default class ConverterFetcher {
  static deleteProfile(profile) {
    const requestOptions = { method: 'DELETE' };
    return fetch(`/api/v1/converter/profiles/${profile.id}`, requestOptions)
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

  static fetchOptions() {
    return fetch('/api/v1/converter/options', {
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


  static createProfile(profile) {
    const requestOptions = {
      method: 'POST',
      body: JSON.stringify(profile),
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


  static updateProfile(profile) {
    const requestOptions = {
      method: 'PUT',
      body: JSON.stringify(profile),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    let ok;
    return fetch(`/api/v1/converter/profiles/${profile.id}`, requestOptions)
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
