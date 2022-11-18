import 'whatwg-fetch';

export default class SampleTaskFetcher {
  static openSampleTasks() {
    return this._fetchSampleTasks('open');
  }

  static openFreeScans() {
    return this._fetchSampleTasks('open_free_scan');
  }

  static _fetchSampleTasks(status) {
    return fetch(
      `/api/v1/sample_tasks?status=${status}`,
      {
        credentials: 'same-origin',
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    ).then(
      response => response.json()
    ).then(
      json => json.sample_tasks
    ).catch(
      errorMessage => { console.log(errorMessage); }
    );
  }

}
