import ApiClient from 'src/api_clients/ChemotionApiClient';
import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';

export default class GenericDSsFetcher extends GenericBaseFetcher {
  static fetchRepo() {
    return ApiClient.getJson('/api/v1/generic_dataset/fetch_repo');
  }

  static createRepo(params) {
    return ApiClient.postJson('/api/v1/generic_dataset/create_repo_klass', { body: params });
  }

  static fetchKlass() {
    return ApiClient.getJson('/api/v1/generic_dataset/klasses');
  }

  static listDatasetKlass(params = {}) {
    const path = params.is_active === undefined
      ? 'list_dataset_klass'
      : `list_dataset_klass?is_active=${params.is_active}`;
    return ApiClient.getJson(`/api/v1/generic_dataset/${path}`);
  }

  static updateDatasetTemplate(params) {
    return ApiClient.postJson('/api/v1/generic_elements/update_template', {
      body: { ...params, klass: 'DatasetKlass' }
    });
  }
}
