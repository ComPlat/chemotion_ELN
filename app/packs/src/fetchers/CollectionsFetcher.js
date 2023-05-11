import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { downloadBlob } from 'src/utilities/FetcherHelper';

export default class CollectionsFetcher {
  static takeOwnership(params) {
    let sync = params.isSync ? "syncC" : "c"
    let promise = fetch(`/api/v1/${sync}ollections/take_ownership/${params.id}`, {
      credentials: 'same-origin',
      method: 'POST'
    })

    return promise;
  }

  static fetchGenericEls() {
    const promise = fetch('/api/v1/collections/locked.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static fetchMyRoots() {
    let promise = fetch('/api/v1/collections/all', {
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

  static fetchSharedWithMeRoots() {
    let promise = fetch('/api/v1/share_collections', {
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

  static createSelectedSharedCollections(params) {
      return fetch('/api/v1/share_collections/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: params.ui_state,
        collection_id: params.collection_id,
        user_ids: params.user_ids,
        newCollection: params.new_label,
        action: 'share'
      })
    }).then(response => response)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static createSharedCollections(params) {
    let collectionId = params.id;
    return fetch('/api/v1/share_collections/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: { currentCollection: {...params.current_collection, id: collectionId} },
        user_ids: params.user_ids,
        action: 'share'
      })
    }).then(response => response)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static editShare(params) {
    let promise = fetch('/api/v1/share_collections/' + params.id, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection_attributes: params.current_collection
      })
    })

    return promise;
  }

  static deleteShare(params) {
    let promise = fetch('/api/v1/share_collections/' + params.id, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    return promise;
  }

  static bulkUpdateCollections(params) {
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

  static rejectShared(params) {
    const promise = fetch('/api/v1/collections/reject_shared', {
      credentials: 'same-origin',
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: params.id
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

  static moveOrAssignElementsCollection(params, action) {
    return fetch('/api/v1/share_collections/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: params.ui_state,
        collection_id: params.collection_id,
        newCollection: params.newLabel,
        action: action
      })
    }).then(response => response)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static exportSamples(type, id) {
    const fileName = `${type.charAt(0).toUpperCase() + type.substring(1)}_${id}_Samples Excel.xlsx`;
    return fetch(`/api/v1/reports/excel_${type}?id=${id}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
    }).then((response) => {
      if (response.ok) { return response.blob(); }
      throw Error(response.statusText);
    }).then((blob) => {
      downloadBlob(fileName, blob);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static removeElementsCollection(params) {
    return fetch('/api/v1/collections/elements/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: params.ui_state,
      })
    }).then(response => response)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static createExportJob(params) {
    return fetch('/api/v1/collections/exports/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => {
      NotificationActions.notifyExImportStatus('Collection export', response.status);
      if (response.ok) { return true; }
      throw new Error(response.status);
    }).catch((errorMessage) => { throw new Error(errorMessage); });
  }

  static createImportJob(params) {
    const data = new FormData();
    data.append('file', params.file);

    return fetch('/api/v1/collections/imports/', {
      credentials: 'same-origin',
      method: 'POST',
      body: data
    }).then((response) => {
      NotificationActions.notifyExImportStatus('Collection import', response.status);
      if (response.ok) { return true; }
      throw new Error(response.status);
    }).catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchTabsLayout(params) {
    let promise = fetch('/api/v1/collections/tab_segments/' + params.id, {
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

  static createTabsSegment(params) {
    return fetch('/api/v1/collections/tabs/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: params.currentCollectionId,
        segments: params.layoutSegments
      })
    }).then(response => response)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateTabsLayout(params) {
    return fetch('/api/v1/collections/tabs/', {
      credentials: 'same-origin',
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: params.cId,
        segment: params.segment
      })
    }).then(response => response)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
