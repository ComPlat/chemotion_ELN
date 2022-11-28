import 'whatwg-fetch';

export default class SampleTaskFetcher {
  static openSampleTasks() {
    return this._fetchSampleTasks('open');
  }

  static openFreeScans() {
    return this._fetchSampleTasks('open_free_scan');
  }

  static assignSampleToOpenFreeScan(sample_id, sample_task_id) {
    return fetch(
      `/api/v1/sample_tasks/${sample_task_id}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify({
          update_open_free_scan: {
            sample_id: sample_id
          }
        })
      }
    ).then(
      response => response.json()
    ).catch(
      errorMessage => { console.log(errorMessage); }
    );
  }

  static createSampleTask(sample_id) {
    return fetch(
      `/api/v1/sample_tasks`,
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify({
          create_open_sample_task: {
            sample_id: sample_id
          }
        })
      }
    ).then(
      response => response.json()
    ).catch(
      errorMessage => { console.log(errorMessage); }
    );
  }

  static _fetchSampleTasks(status) {
    return fetch(
      `/api/v1/sample_tasks?status=${status}`,
      this._httpOptions()
    ).then(
      response => response.json()
    ).then(
      json => json.sample_tasks
    ).catch(
      errorMessage => { console.log(errorMessage); }
    );
  }

  static _httpOptions(method = 'GET') {
    return {
      credentials: 'same-origin',
      method: method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };
  }
}
