import 'whatwg-fetch';

export default class ScanTaskFetcher {
  static addNewTask(sample_id) {
    return fetch(`/api/v1/scan_tasks`, {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "sample_id": sample_id
      })
    }).then(response => response.json())
      .catch((errorMessage) => console.log(errorMessage));
  }
}
