import 'whatwg-fetch';

export default class SampleTaskFetcher {
  static openSampleTasks() {
    return this._fetchSampleTasks('open');
  }

  static assignSample(sample_id, sample_task_id) {
    return fetch(
      `/api/v1/sample_tasks/${sample_task_id}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify({
          sample_id: sample_id
        })
      }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static createSampleTask(sample_id, requiredScanResults) {
    return fetch(
      `/api/v1/sample_tasks`,
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify({
          sample_id: sample_id,
          required_scan_results: requiredScanResults
        })
      }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteSampleTask(sample_task_id) {
    return fetch(
      `/api/v1/sample_tasks/${sample_task_id}`,
      { ...this._httpOptions('DELETE') }
    ).then(response => response.json())
     .catch(errorMessage => console.log(errorMessage));
  }

  static _fetchSampleTasks(status) {
    return fetch(
      `/api/v1/sample_tasks?status=${status}`,
      this._httpOptions()
    ).then(response => response.json())
      .then(json => json.sample_tasks)
      .catch(errorMessage => console.log(errorMessage));
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
