import 'whatwg-fetch';
import BaseFetcher from './BaseFetcher';

export default class CollectionsFetcher {
  static takeOwnership(params) {
    let sync = params.isSync ? "syncC" : "c"
    let promise = fetch(`/api/v1/${sync}ollections/take_ownership/${params.id}`, {
      credentials: 'same-origin',
      method: 'POST'
    })

    return promise;
  }

  static fetchLockedRoots() {
    return BaseFetcher.withoutBodyData({
      apiEndpoint: '/api/v1/collections/locked.json',
      requestMethod: 'GET',
      jsonTranformation: (json) => { return json }
    });
  }

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
  static fetchSyncRemoteRoots() {
    let promise = fetch('/api/v1/syncCollections/sync_remote_roots.json', {
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

  static createSharedCollections(params) {
    let promise = fetch('/api/v1/collections/shared/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection_attributes: params.collection_attributes,
        elements_filter: params.elements_filter,
        user_ids: params.user_ids,
        current_collection_id: params.current_collection_id
      })
    })

    return promise;
  }

  static createSync(params) {
    let promise = fetch('/api/v1/syncCollections/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection_attributes: params.collection_attributes,
        user_ids: params.user_ids,
        id: params.id,
      })
    })

    return promise;
  }

  static editSync(params) {
    let promise = fetch('/api/v1/syncCollections/' + params.id, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection_attributes: params.collection_attributes,
        user_ids: params.user_ids,
      })
    })

    return promise;
  }

  static deleteSync(params) {
    let promise = fetch('/api/v1/syncCollections/' + params.id, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
      })
    })

    return promise;
  }


  static bulkUpdateUnsharedCollections(params) {
    let promise = fetch('/api/v1/collections', {
      credentials: 'same-origin',
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collections: params.collections,
        deleted_ids: params.deleted_ids
      })
    })

    return promise;
  }

  static updateSharedCollection(params) {
    let promise = fetch('/api/v1/collections/shared/' + params.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection_attributes: params.collection_attributes,
      })
    })

    return promise;
  }

  static createUnsharedCollection(params) {
    let promise = fetch('/api/v1/collections/unshared/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        label: params.label
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

  static updateElementsCollection(params) {
    let promise = fetch('/api/v1/collections/elements/', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: params.ui_state,
        collection_id: params.collection_id
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

  static assignElementsCollection(params) {
    let promise = fetch('/api/v1/collections/elements/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: params.ui_state,
        collection_id: params.collection_id
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

  static removeElementsCollection(params) {
    let promise = fetch('/api/v1/collections/elements/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: params.ui_state,
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
