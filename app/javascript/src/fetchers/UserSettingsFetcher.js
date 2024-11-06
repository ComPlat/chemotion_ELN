import 'whatwg-fetch';

export default class UserSettingsFetcher {
  static getAutoCompleteSuggestions(type) {
    return fetch(
      `/api/v1/public/affiliations/${type}`
    ).then((response) => response.json())
      .then((data) => {
        return data
          .filter(item => item && item.trim() !== '')
          .map(item => ({ value: item, label: item }));
      })
      .catch((error) => {
        console.log(error);
      });
  }

  static getAllAffiliations() {
    return fetch(
      '/api/v1/affiliations/'
    ).then((response) => response.json())
      .then((data) => data)
      .catch((error) => {
        console.log(error);
      });
  }

  static createAffiliation(params) {
    return fetch('/api/v1/affiliations/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }).then((response) => response.json())
      .then((data) => data)
      .catch((error) => {
        console.log(error);
      });
  }

  static updateAffiliation(params) {
    return fetch('/api/v1/affiliations/', {
      credentials: 'same-origin',
      method: 'PUT',
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

  static deleteAffiliation(id) {
    return fetch(`/api/v1/affiliations/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }
}
