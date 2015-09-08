import 'whatwg-fetch';

export default class CollectionsFetcher {
  static fetchUnsharedRoots() {
    let promise = fetch('/api/v1/collections/roots.json', {
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

  static fetchSharedRoots() {
    let promise = fetch('/api/v1/collections/shared_roots.json', {
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

  static fetchRemoteRoots() {
    let promise = fetch('/api/v1/collections/remote_roots.json', {
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

  static createSharedCollections(paramObj) {
    let promise = fetch('/api/v1/collections/shared/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection_attributes: paramObj.collection_attributes,
        elements_filter: paramObj.elements_filter,
        user_ids: paramObj.user_ids
      })
    })

    return promise;
  }
}
