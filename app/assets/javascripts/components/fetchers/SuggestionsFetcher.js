import 'whatwg-fetch';

export default class SuggestionsFetcher {
  static fetchSuggestions(endpoint, query) {
    // TODO: scope on current collection?
    let promise = fetch(endpoint + query + '.json', {
        credentials: 'same-origin'
      }).then(response => {
        return response.json();
      }).then(json => {
        return json.suggestions;
      }).catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }
}
