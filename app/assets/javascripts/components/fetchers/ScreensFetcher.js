import 'whatwg-fetch';

export default class ScreensFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/screens/' + id + '.json', {
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

  static fetchByCollectionId(id, queryParams={}) {
    let page = queryParams.page || 1;
    let api = id == 'all' ? `/api/v1/screens.json?page=${page}` : `/api/v1/screens.json?collection_id=${id}&page=${page}`;
    let promise = fetch(api, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json().then((json) => {
          return {
            elements: json.screens,
            totalElements: response.headers.get('X-Total'),
            page: response.headers.get('X-Page'),
            pages: response.headers.get('X-Total-Pages')
          }
        })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static update(paramObj) {
    console.log('not implemented yet');
  }
}
