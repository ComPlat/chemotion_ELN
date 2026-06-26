import ApiClient from 'src/api_clients/ChemotionApiClient';
import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';
import { getFileName, downloadBlob } from 'src/utilities/FetcherHelper';

export default class GenericSgsFetcher extends GenericBaseFetcher {
  static fetchRepo() {
    return ApiClient.getJson('/api/v1/segments/fetch_repo');
  }

  static createRepo(params) {
    return ApiClient.postJson('/api/v1/segments/create_repo_klass', { body: params });
  }

  static createKlass(params) {
    return ApiClient.postJson('/api/v1/segments/create_segment_klass', { body: params });
  }

  static fetchKlass(elementName = null) {
    const path = elementName == null ? 'klasses' : `klasses?element=${elementName}`;
    return ApiClient.getJson(`/api/v1/segments/${path}`);
  }

  static fetchRepoKlassList() {
    return ApiClient.getJson('/api/v1/segments/fetch_repo_generic_template_list');
  }

  static listSegmentKlass(params = {}) {
    const path = params.is_active === undefined
      ? 'list_segment_klass'
      : `list_segment_klass?is_active=${params.is_active}`;
    return ApiClient.getJson(`/api/v1/segments/${path}`);
  }

  static syncTemplate(params) {
    return ApiClient.postJson('/api/v1/segments/fetch_repo_generic_template', { body: params });
  }

  static updateSegmentKlass(params) {
    return ApiClient.postJson('/api/v1/segments/update_segment_klass', { body: params });
  }

  static updateSegmentTemplate(params) {
    return ApiClient.postJson('/api/v1/generic_elements/update_template', {
      body: { ...params, klass: 'SegmentKlass' }
    });
  }

  static uploadKlass(params) {
    return ApiClient.postJson('/api/v1/segments/upload_klass', { body: params });
  }

  static downloadKlass(id) {
    let fileName;
    return ApiClient.getJson(`/api/v1/segments/download_klass?id=${id}`, {
      handleResponseSuccess: (response) => {
        if (response.ok) {
          fileName = getFileName(response);
          return response.blob();
        }
        throw Error(response.statusText);
      }
    })
      .then((blob) => {
        downloadBlob(fileName, blob);
      });
  }
}
