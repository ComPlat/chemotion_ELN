import 'whatwg-fetch';
import Wellplate from '../models/Wellplate';
import UIStore from '../stores/UIStore'
import AttachmentFetcher from './AttachmentFetcher'

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

  static fetchByCollectionId(id, queryParams={}, isSync=false) {
    let page = queryParams.page || 1;
    let per_page = queryParams.per_page || UIStore.getState().number_of_results
    let api = `/api/v1/wellplates.json?${isSync ? "sync_" : ""}collection_id=${id}&page=${page}&per_page=${per_page}`;
    let promise = fetch(api, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json().then((json) => {
          return {
            elements: json.wellplates.map((w) => new Wellplate(w)),
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

  static bulkCreateWellplates(params) {
    let promise = fetch('/api/v1/wellplates/bulk', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static update(params) {

    const wellplate = new Wellplate(params);
    let files = AttachmentFetcher.getFileListfrom(wellplate.container)

    let promise = () => fetch('/api/v1/wellplates/' + wellplate.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wellplate.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Wellplate(json.wellplate);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if(files.length > 0 ){
        return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    }else{
      return promise()
    }
  }

  static create(params) {
    let files = AttachmentFetcher.getFileListfrom(wellplate.container)

    let promise = () => fetch('/api/v1/wellplates/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Wellplate(json.wellplate);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if(files.length > 0){
      return AttachmentFetcher.uploadFiles(files)().then(()=> promise());
    }else{
      return promise()
    }
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
          collection_id: params.currentCollection.id,
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
