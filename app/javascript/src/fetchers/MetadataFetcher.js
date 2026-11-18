import ApiClient from 'src/api_clients/ChemotionApiClient';
import Metadata from 'src/models/Metadata';

// The client's defaults skip the status check and swallow rejections, so a refused write used to
// resolve like a successful one. Both are overridden here, lifting Grape's `{"error": …}` body into
// the message so the caller can show it. Same shape as ElementVariationFetcher.
const rethrow = (error) => Promise.reject(error);

const rejectWithMessage = (response) => response.json()
  .catch(() => null)
  .then((json) => {
    const message = (json && (json.error || json.message)) || `Request failed (${response.status})`;
    return Promise.reject(new Error(message));
  });

export default class MetadataFetcher {
  static fetch(id) {
    return ApiClient.getJson(`/api/v1/collections/${id}/metadata`, {

    })
      .then((json) => {
        if (json.error) {
          return Metadata.buildEmpty(id);
        }
        return new Metadata({ type: 'metadata', ...json });
      });
  }

  static store(metadata) {
    return ApiClient.postJson('/api/v1/collections/metadata', {
      body: metadata.serialize(),
      handleResponseSuccess: (response) => {
        if (!response.ok) return rejectWithMessage(response);
        return response.json();
      },
      handleResponseError: rethrow,
    })
      .then((json) => new Metadata({ type: 'metadata', ...json }));
  }
}
