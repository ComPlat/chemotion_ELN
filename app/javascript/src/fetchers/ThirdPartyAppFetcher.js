import ApiClient from 'src/api_clients/ChemotionApiClient';

const TPA_ENDPOINT = '/api/v1/third_party_apps';
const TPA_ENDPOINT_ADMIN = `${TPA_ENDPOINT}/admin`;

export default class ThirdPartyAppFetcher {
  static fetchThirdPartyApps(id = null) {
    const url = id ? `${TPA_ENDPOINT}/${id}` : TPA_ENDPOINT;
    return ApiClient.getJson(url);
  }

  static createOrUpdateThirdPartyApp(id, name, url, fileTypes) {
    const idPath = id ? `/${id}` : '';
    const path = `${TPA_ENDPOINT_ADMIN}${idPath}`;
    // eslint-disable-next-line camelcase
    const body = { name, url, file_types: fileTypes };

    if (id) { return ApiClient.putJson(path, { body }); }
    return ApiClient.postJson(path, { body });
  }

  static deleteThirdPartyApp(id) {
    return ApiClient.deleteRequest(`${TPA_ENDPOINT_ADMIN}/${id}`);
  }

  static fetchAttachmentToken(attID, appID) {
    const queryParams = new URLSearchParams({ attID, appID }).toString();
    const url = `${TPA_ENDPOINT}/token?${queryParams}`;
    return ApiClient.getJson(url);
  }

  static getHandlerUrl(attID, type) {
    const queryParams = new URLSearchParams({ attID, type }).toString();
    const url = `${TPA_ENDPOINT}/url?${queryParams}`;
    return ApiClient.getJson(url);
  }
}
