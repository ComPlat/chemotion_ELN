import 'whatwg-fetch';

// TODO: SamplesFetcher also updates Samples and so on...naming?
export default class UsersFetcher {
  static fetchUsersByName(name) {
    let promise = fetch(`/api/v1/users/name.json?name=${name}`, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchCurrentUser() {
    let promise = fetch('/api/v1/users/current.json', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchProfile() {
    let promise = fetch('/api/v1/profiles.json', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static updateCurrentUserLayout(layout) {
    let promise = fetch('/api/v1/users/layout/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({layout})
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static updateShowSampleExt(show) {
    let promise = fetch('/api/v1/users/profile/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({show_external_name: show})
    }).then((response) => {
      return response.json()
    }).then((json) => {
      let result = json ? show : -1;
      return result;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
