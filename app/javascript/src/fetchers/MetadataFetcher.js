import ApiClient from 'src/api_clients/ChemotionApiClient';
import Metadata from 'src/models/Metadata';

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
    return ApiClient.postJson('/api/v1/collections/metadata', { body: metadata.serialize() })
      .then((json) => new Metadata({ type: 'metadata', ...json }));
  }
}
