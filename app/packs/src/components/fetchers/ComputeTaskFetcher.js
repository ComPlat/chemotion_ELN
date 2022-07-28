import 'whatwg-fetch';
import { camelizeKeys } from 'humps';

import LoadingActions from '../actions/LoadingActions';

export default class ComputeTaskFetcher {
  static fetchAll() {
    return fetch('/api/v1/compute_tasks/all', {
      method: 'GET',
      credentials: 'same-origin',
    }).then(res => res.json()).then(json => (
      camelizeKeys(json.compute_tasks || [])
    )).catch(err => console.log(err));
  }

  static checkState(taskId) {
    return fetch(`/api/v1/compute_tasks/${taskId}/check`, {
      method: 'GET',
      credentials: 'same-origin',
    }).then(res => res.json()).then((json) => {
      LoadingActions.stop.defer();
      return camelizeKeys(json.check);
    }).catch(err => console.log(err));
  }

  static revokeTask(taskId) {
    return fetch(`/api/v1/compute_tasks/${taskId}/revoke`, {
      method: 'GET',
      credentials: 'same-origin',
    }).then(res => res.json()).then((json) => {
      LoadingActions.stop.defer();
      return camelizeKeys(json.revoke);
    }).catch(err => console.log(err));
  }

  static deleteTask(taskId) {
    return fetch(`/api/v1/compute_tasks/${taskId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }).then(res => res.json()).then((json) => {
      LoadingActions.stop.defer();
      return camelizeKeys(json);
    }).catch(err => console.log(err));
  }
}

