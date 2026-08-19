import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class EditorFetcher {
  static config() {
    return ApiClient.getJson('/api/v1/editor/config.json');
  }

  static startEditing(params) {
    const { attachmentId, forceStop } = params;
    return ApiClient.getJson(`/api/v1/editor/${attachmentId}/${forceStop ? 'end' : 'start'}/`);
  }
}
