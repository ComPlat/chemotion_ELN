import 'whatwg-fetch';

export default class ContainerTreeFetcher {

  static fetchByCollectionId(id) {
    let promise = fetch('/api/v1/tree/' + id + '.json', {
      credentials: 'same-origin'
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
