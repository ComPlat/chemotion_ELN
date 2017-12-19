import 'whatwg-fetch';
import Screen from '../models/Screen';
import UIStore from '../stores/UIStore'
import AttachmentFetcher from './AttachmentFetcher'

export default class ScreensFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/screens/' + id + '.json', {
      credentials: 'same-origin'
    })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return new Screen(json.screen);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static fetchByCollectionId(id, queryParams = {}, isSync=false) {
    let page = queryParams.page || 1;
    let per_page = queryParams.per_page || UIStore.getState().number_of_results
    let from_date = '';
    if (queryParams.fromDate) {
      from_date = `&from_date=${queryParams.fromDate.unix()}`
    }
    let to_date = '';
    if (queryParams.toDate) {
      to_date = `&to_date=${queryParams.toDate.unix()}`
    }
    let api = `/api/v1/screens.json?${isSync ? "sync_" : ""}` +
              `collection_id=${id}&page=${page}&per_page=${per_page}` +
              `${from_date}${to_date}`;
    let promise = fetch(api, {
      credentials: 'same-origin'
    })
      .then((response) => {
        return response.json().then((json) => {
          return {
            elements: json.screens.map(s => new Screen(s)),
            totalElements: parseInt(response.headers.get('X-Total')),
            page: parseInt(response.headers.get('X-Page')),
            pages: parseInt(response.headers.get('X-Total-Pages')),
            perPage: parseInt(response.headers.get('X-Per-Page'))
          }
        })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static update(screen) {
    let files = AttachmentFetcher.getFileListfrom(screen.container)

    let promise = () => fetch('/api/v1/screens/' + screen.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(screen.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Screen(json.screen);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if(files.length > 0 ){
        return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    }else{
      return promise()
    }

  }

  static create(screen) {
    let files = AttachmentFetcher.getFileListfrom(screen.container)

    let promise = () => fetch('/api/v1/screens/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(screen.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Screen(json.screen);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if(files.length > 0){
      return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    }else{
      return promise()
    }

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
          collection_id: ui_state.currentCollection.id,
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
