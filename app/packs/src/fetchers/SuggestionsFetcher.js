import 'whatwg-fetch';

export default class SuggestionsFetcher {
  static fetchSuggestionsForCurrentUser(elementType, query, collectId, isSync = false) {
    return fetch(
      `/api/v1/suggestions/${elementType}?query=${encodeURIComponent(query)}&collection_id=${collectId}&is_sync=${isSync}`,
      { credentials: 'same-origin' }
    ).then(response => response.json())
      .then(json => json.suggestions)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
