import 'whatwg-fetch';

import { camelize, decamelize } from 'humps';

export default class TaskFetcher {
  static addNewTask(sample_id) {
    return fetch(`/api/v1/tasks`, {
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
      .then(json => json)
      .catch((errorMessage) => console.log(errorMessage));
  }
}
