import 'whatwg-fetch';
import { camelizeKeys } from 'humps';

export default class ComputeTaskFetcher {
  static fetchAll() {
    const promise = fetch('/api/v1/compute_task/all', {
      method: 'GET',
      credentials: 'same-origin',
    }).then(res => res.json()).then(json => (
      camelizeKeys(json.compute_task)
    )).catch(err => console.log(err));

    return promise;
  }
}

