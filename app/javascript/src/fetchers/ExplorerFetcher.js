import 'whatwg-fetch';

export default class ExplorerFetcher {
  static fetch({ collectionId }) {
    if (!collectionId) {
      throw new Error('collectionId is required');
    }

    const url = new URL(`${window.location.origin}/api/v1/explorer?collection_id=${collectionId}`);
    url.search = new URLSearchParams({ collection_id: collectionId });

	return fetch(url.href, {
      credentials: 'same-origin'
    })
    .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok (${response.status})`);
        }
        return response.json();
    })
    .then((response) => ({
        samples: response.samples || [],
        reactions: response.reactions || [],
        molecules: response.molecules || []
      }))
    .catch((error) => {
        console.error('ElementFetcher fetch error:', error);
    });
  }

}