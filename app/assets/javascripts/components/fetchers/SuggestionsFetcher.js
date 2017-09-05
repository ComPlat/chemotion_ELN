import 'whatwg-fetch';

export default class SuggestionsFetcher {
  static fetchSuggestionsForCurrentUser(endpoint, query, userId, collectionId,
    isSync = false) {
    let promise = fetch(endpoint + query + '.json?user_id=' + userId +
      '&collection_id=' + collectionId + '&isSync=' + isSync,
      { credentials: 'same-origin'})
      .then(response => {
        return response.json();
      }).then(json => {
        return json.suggestions;
      }).catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }
}
