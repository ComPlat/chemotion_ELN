import 'whatwg-fetch';

export default class WellplatesFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/wellplates/' + id + '.json', {
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
    let api = id == 'all' ? `/api/v1/wellplates.json?page=${page}` : `/api/v1/wellplates.json?collection_id=${id}&page=${page}`;
    let promise = fetch(api, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json().then((json) => {
          return {
            elements: json.wellplates,
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

  static deleteWellplatesByUIState(paramObj) {
    let promise = fetch('/api/v1/wellplates', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: paramObj.wellplate.checkedAll,
          included_ids: paramObj.wellplate.checkedIds,
          excluded_ids: paramObj.wellplate.uncheckedIds
        }
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
