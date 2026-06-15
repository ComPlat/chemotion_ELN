import ApiClient from 'src/api_clients/ChemotionApiClient';
import HistoryVersion from 'src/models/HistoryVersion';

export default class VersionsFetcher {
  static fetch({
    type, id, page, perPage
  }) {
    const url = new URL(`${window.location.origin}/api/v1/versions/${type}/${id}`);
    url.search = new URLSearchParams({
      page: page || 1,
      per_page: perPage || 10,
    });

    return ApiClient.getJson(url.href, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.versions.map((v) => (new HistoryVersion(v))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
  }

  static revert(json) {
    return ApiClient.postJson('/api/v1/versions/revert', { body: { changes: json } });
  }
}
