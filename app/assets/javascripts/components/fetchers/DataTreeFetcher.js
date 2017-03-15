import 'whatwg-fetch';

export default class DataTreeFetcher {

  static fetchByCollectionId(id) {
    let api =  '/api/v1/tree/' + id + '.json'
    let promise = fetch(api, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
        })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
}
