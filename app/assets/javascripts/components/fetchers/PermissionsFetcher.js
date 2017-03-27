import 'whatwg-fetch';

export default class PermissionsFetcher {
  static fetchPermissionStatus(params) {
    let promise = fetch('/api/v1/permissions/status/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        elements_filter: params.elements_filter
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  
}
