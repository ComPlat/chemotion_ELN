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

  static fetchByCollectionId(id, queryParams = {}) {
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

  static update(screen) {
    const {id, wellplate_ids, name, collaborator, result, conditions, requirements, description} = screen;
    let promise = fetch('/api/v1/screens/' + id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        collaborator,
        result,
        conditions,
        requirements,
        description,
        wellplate_ids
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

  static create(screen) {
    const {collection_id, wellplate_ids, name, collaborator, result, conditions, requirements, description} = screen;
    let promise = fetch('/api/v1/screens/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        collaborator,
        result,
        conditions,
        requirements,
        description,
        wellplate_ids,
        collection_id: collection_id
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

  static deleteScreensByUIState(ui_state) {
    let promise = fetch('/api/v1/screens/ui_state/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: ui_state.screen.checkedAll,
          included_ids: ui_state.screen.checkedIds,
          excluded_ids: ui_state.screen.uncheckedIds
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
