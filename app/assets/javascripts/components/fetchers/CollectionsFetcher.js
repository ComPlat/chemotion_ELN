import 'whatwg-fetch';

export default class CollectionsFetcher {
  static takeOwnership(paramObj) {
    let promise = fetch('/api/v1/collections/take_ownership/' + paramObj.id, {
      credentials: 'same-origin',
      method: 'POST'
    })

    return promise;
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

  static createSharedCollections(paramObj) {
    let promise = fetch('/api/v1/collections/shared/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection_attributes: paramObj.collection_attributes,
        elements_filter: paramObj.elements_filter,
        user_ids: paramObj.user_ids,
        current_collection_id: paramObj.current_collection_id
      })
    })

    return promise;
  }

  static bulkUpdateUnsharedCollections(paramObj) {
    let promise = fetch('/api/v1/collections', {
      credentials: 'same-origin',
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collections: paramObj.collections,
        deleted_ids: paramObj.deleted_ids
      })
    })

    return promise;
  }

  static updateSharedCollection(paramObj) {
    let promise = fetch('/api/v1/collections/shared/' + paramObj.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        permission_level: paramObj.permission_level,
        sample_detail_level: paramObj.sample_detail_level,
        reaction_detail_level: paramObj.reaction_detail_level,
        wellplate_detail_level: paramObj.wellplate_detail_level
      })
    })

    return promise;
  }

  static createUnsharedCollection(paramObj) {
    let promise = fetch('/api/v1/collections/unshared/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        label: paramObj.label
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

  static updateElementsCollection(paramObj) {
    let promise = fetch('/api/v1/collections/elements/', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: paramObj.ui_state,
        collection_id: paramObj.collection_id
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

  static assignElementsCollection(paramObj) {
    let promise = fetch('/api/v1/collections/elements/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: paramObj.ui_state,
        collection_id: paramObj.collection_id
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

  static removeElementsCollection(paramObj) {
    let promise = fetch('/api/v1/collections/elements/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: paramObj.ui_state,
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
