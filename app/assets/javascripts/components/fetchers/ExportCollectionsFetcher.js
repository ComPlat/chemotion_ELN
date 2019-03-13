import 'whatwg-fetch';

export default class ExportCollectionsFetcher {

  static createJob(params) {

    let promise = fetch('/api/v1/exports/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => {
      return response.json()
    }).then((json) => {
      console.log(json.export_id);
      // after a short delay, start polling
      setTimeout(() => {
        ExportCollectionsFetcher.pollJob(json.export_id)
      }, 1000);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static pollJob(exportId) {

    let promise = fetch(`/api/v1/exports/${exportId}`, {
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
          ExportCollectionsFetcher.pollJob(exportId);
        }, 4000);
      } else if (json.status == 'COMPLETED') {
        // download the file, headers will prevent the browser from reloading the page
        window.location.href = json.url;
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
