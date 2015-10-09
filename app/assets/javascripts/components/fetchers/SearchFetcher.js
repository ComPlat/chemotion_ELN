import 'whatwg-fetch';

export default class SearchFetcher {
  static fetchBasedOnSearchSelectionAndCollection(selection, collectionId) {
    let promise = fetch('/api/v1/search/' + selection.elementType, {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selection: selection,
          collection_id: collectionId
        })
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
}
