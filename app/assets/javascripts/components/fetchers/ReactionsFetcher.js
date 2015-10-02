import 'whatwg-fetch';
import Reaction from '../models/Reaction';

// TODO: Extract common base functionality into ElementsFetcher
export default class ReactionsFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/reactions/' + id + '.json', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return new Reaction(json.reaction);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchByCollectionId(id, queryParams={}) {
    let page = queryParams.page || 1
    let api = id == 'all' ? `/api/v1/reactions.json?page=${page}` : `/api/v1/reactions.json?collection_id=${id}&page=${page}`
    let promise = fetch(api, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json().then((json) => {
          return {
            elements: json.reactions.map((r) => new Reaction(r)),
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

  static deleteReactionsByUIState(paramObj) {
    let promise = fetch('/api/v1/reactions/ui_state/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: paramObj.reaction.checkedAll,
          included_ids: paramObj.reaction.checkedIds,
          excluded_ids: paramObj.reaction.uncheckedIds
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
