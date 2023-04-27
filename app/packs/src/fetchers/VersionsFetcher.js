import 'whatwg-fetch';
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

    return fetch(url.href, {
      credentials: 'same-origin'
    }).then((response) => (
      response.json().then((json) => ({
        elements: json.versions.map((v) => (new HistoryVersion(v))),
        totalElements: parseInt(response.headers.get('X-Total'), 10),
        page: parseInt(response.headers.get('X-Page'), 10),
        pages: parseInt(response.headers.get('X-Total-Pages'), 10),
        perPage: parseInt(response.headers.get('X-Per-Page'), 10)
      }))
    )).catch((errorMessage) => { console.log(errorMessage); });
  }

  static revert(json) {
    return fetch('/api/v1/versions/revert', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        changes: json
      })
    });
  }
}
