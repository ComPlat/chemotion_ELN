import 'whatwg-fetch';

export default class ProfilesFetcher {
  static uploadUserTemplates(prms) {
    return fetch('/api/v1/profiles', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prms)
    }).then((response) => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static deleteUserTemplate(prms) {
    return fetch('/api/v1/profiles', {
      credentials: 'same-origin',
      method: 'delete',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prms)
    }).then((response) => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}