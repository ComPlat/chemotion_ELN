import 'whatwg-fetch';
import _ from 'lodash';

export default class ExportFetcher {

  static createDownloadJob(params) {

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
      // after a short delay, start polling
      setTimeout(() => {
        ExportFetcher.pollDownloadJob(json.job_id)
      }, 1000);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static pollDownloadJob(jobId) {

    let promise = fetch(`/api/v1/exports/${jobId}`, {
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
          ExportFetcher.pollDownloadJob(jobId);
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
