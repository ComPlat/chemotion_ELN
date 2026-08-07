import ApiClient from 'src/api_clients/ChemotionApiClient';
import { camelizeKeys } from 'src/utilities/FetcherHelper';

import LoadingActions from 'src/stores/alt/actions/LoadingActions';

export default class ComputeTaskFetcher {
  static fetchAll() {
    return ApiClient.getJson('/api/v1/compute_tasks/all')
      .then((json) => camelizeKeys(json.compute_tasks || []));
  }

  static checkState(taskId) {
    return ApiClient.getJson(`/api/v1/compute_tasks/${taskId}/check`)
      .then((json) => {
        LoadingActions.stop.defer();
        return camelizeKeys(json.check);
      });
  }

  static revokeTask(taskId) {
    return ApiClient.getJson(`/api/v1/compute_tasks/${taskId}/revoke`)
      .then((json) => {
        LoadingActions.stop.defer();
        return camelizeKeys(json.revoke);
      });
  }

  static deleteTask(taskId) {
    return ApiClient.deleteRequest(`/api/v1/compute_tasks/${taskId}`)
      .then((json) => {
        LoadingActions.stop.defer();
        return camelizeKeys(json);
      });
  }
}
