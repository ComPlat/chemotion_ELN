import 'whatwg-fetch';

export default class SuggestionsFetcher {
  static fetchSuggestionsForCurrentUser(elementType, query, collectId) {
    return fetch(
      `/api/v1/suggestions/${elementType}?query=${encodeURIComponent(query)}&collection_id=${collectId}`,
      { credentials: 'same-origin' }
    ).then(response => response.json())
      .then(json => json.suggestions)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
