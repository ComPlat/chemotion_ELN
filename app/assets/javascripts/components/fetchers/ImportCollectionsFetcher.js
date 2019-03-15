import 'whatwg-fetch';
import CollectionActions from '../actions/CollectionActions';
import NotificationActions from '../actions/NotificationActions';

export default class ImportCollectionsFetcher {

  static createJob(params) {

    var data = new FormData();
    data.append("file", params.file);

    let promise = fetch('/api/v1/imports/', {
      credentials: 'same-origin',
      method: 'POST',
      body: data
    }).then((response) => {
      return response.json()
    }).then((json) => {
      // after a short delay, start polling
      setTimeout(() => {
        ImportCollectionsFetcher.pollJob(json.import_id)
      }, 1000);

      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static pollJob(importId) {

    let promise = fetch(`/api/v1/imports/${importId}`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      return response.json()
    }).then((json) => {
      if (json.status == 'EXECUTING') {
        // continue polling
        setTimeout(() => {
          ImportCollectionsFetcher.pollJob(importId);
        }, 1000);
      } else {
        // remove the notification
        NotificationActions.removeByUid('import_collections')

        // reload the unshared collections
        CollectionActions.fetchUnsharedCollectionRoots()
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}