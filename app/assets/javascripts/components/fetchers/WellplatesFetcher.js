import 'whatwg-fetch';
import Wellplate from '../models/Wellplate';

export default class WellplatesFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/wellplates/' + id + '.json', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return new Wellplate(json.wellplate);
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
            elements: json.wellplates.map((w) => new Wellplate(w)),
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

  static update(wellplate) {
    const {id, collection_id, name, size, description, wells} = wellplate;
    let promise = fetch('/api/v1/wellplates/' + id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id,
        name,
        size,
        description,
        wells,
        collection_id
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Wellplate(json.wellplate);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static create(wellplate) {
    const {collection_id, name, size, description, wells} = wellplate;
    let promise = fetch('/api/v1/wellplates/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        size,
        description,
        wells,
        collection_id
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Wellplate(json.wellplate);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static deleteWellplatesByUIState(params) {
    let promise = fetch('/api/v1/wellplates/ui_state/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: params.wellplate.checkedAll,
          included_ids: params.wellplate.checkedIds,
          excluded_ids: params.wellplate.uncheckedIds
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
