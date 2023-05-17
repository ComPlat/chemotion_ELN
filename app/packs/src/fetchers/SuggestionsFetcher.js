export default class SuggestionsFetcher {
<<<<<<< HEAD
  static fetchSuggestionsForCurrentUser(elementType, query, collectId, isShared = false) {
    const urlParams=new URLSearchParams({
      query: encodeURIComponent(query),
      collection_id: collectId,
      is_shared: isShared})

      elementType=elementType.replaceAll(" ", "_");

    return fetch(
      `/api/v1/suggestions/${elementType}?`+urlParams,
=======
  static fetchSuggestionsForCurrentUser(elementType, query, collectId) {
    return fetch(
      `/api/v1/suggestions/${elementType}?query=${encodeURIComponent(query)}&collection_id=${collectId}`,
>>>>>>> WIP deprecate is_shared
      { credentials: 'same-origin' }
    ).then(response => response.json())
      .then(json => json.suggestions)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
