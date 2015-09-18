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
      method: 'POST',
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
}
