import 'whatwg-fetch';

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
      console.log('ok!');
      // // after a short delay, start polling
      // setTimeout(() => {
      //   ExportFetcher.pollJob(json.job_id)
      // }, 1000);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  // static pollJob(jobId) {

  //   let promise = fetch(`/api/v1/imports/${jobId}`, {
  //     credentials: 'same-origin',
  //     method: 'GET',
  //     headers: {
  //       'Accept': 'application/json',
  //       'Content-Type': 'application/json'
  //     }
  //   }).then((response) => {
  //     return response.json()
  //   }).then((json) => {
  //     if (json.status == 'EXECUTING') {
  //       // continue polling
  //       setTimeout(() => {
  //         ExportFetcher.pollJob(jobId);
  //       }, 4000);
  //     } else if (json.status == 'COMPLETED') {
  //       // download the file, headers will prevent the browser from reloading the page
  //       window.location.href = json.url;
  //     }
  //   }).catch((errorMessage) => {
  //     console.log(errorMessage);
  //   });

  //   return promise;
  // }
}