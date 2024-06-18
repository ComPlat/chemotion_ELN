export default class SuggestionsFetcher {
  static fetchSuggestionsForCurrentUser(elementType, query, collectId, isShared = false) {
    const urlParams=new URLSearchParams({
      query: encodeURIComponent(query),
      collection_id: collectId,
      is_shared: isShared})

      elementType=elementType.replaceAll(" ", "_");

    return fetch(
      `/api/v1/suggestions/${elementType}?`+urlParams,
      { credentials: 'same-origin' }
    ).then(response => response.json())
      .then(json => json.suggestions)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
