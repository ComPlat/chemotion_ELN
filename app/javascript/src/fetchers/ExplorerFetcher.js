import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class ExplorerFetcher {
  static fetch({ collectionId }) {
    if (!collectionId) {
      throw new Error('collectionId is required');
    }

    const params = new URLSearchParams({ collection_id: collectionId });

    return ApiClient.getJson(`/api/v1/explorer?${params}`, {
      // The default success handler skips the status check and the default error
      // handler swallows rejections; both are overridden so the caller's
      // try/catch (ExplorerContainer) still sees a failed request.
      handleResponseSuccess: (response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok (${response.status})`);
        }
        return response.json();
      },
      handleResponseError: (error) => { throw error; },
    }).then((response) => ({
      samples: response.samples || [],
      reactions: response.reactions || [],
      molecules: response.molecules || [],
    }));
  }
}
